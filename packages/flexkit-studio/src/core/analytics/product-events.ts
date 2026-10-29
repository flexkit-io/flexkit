import { userApiPaths } from '../api-paths';
import { getDesktop } from '../desktop';
import { PROJECT_ID_PATTERN } from '../error/error-reporter';
import { isStudioTelemetryEnabled, postToUserApi } from '../telemetry';

/**
 * Product events only the Studio can see, sent to Flexkit through the
 * Studio's own server proxy (`/api/flexkit/-/product-events`) with the
 * session: the Graph app opened, the desktop app launched. They follow the
 * Studio's telemetry setting (see core/telemetry.ts) and carry ids, the
 * desktop app version and the OS only.
 */
export type StudioProductEvent =
  | { event: 'graph_opened'; projectId: string }
  | { event: 'desktop_app_opened'; appVersion: string; os: 'darwin' | 'linux' | 'win32' };

/** Identity of an event within a page session; the backend also counts each once per day. */
export function productEventKey(studioEvent: StudioProductEvent): string {
  return studioEvent.event === 'graph_opened' ? `graph_opened:${studioEvent.projectId}` : studioEvent.event;
}

/** Sends the event body; resolves with the response status. */
export type SendProductEvent = (body: string) => Promise<number>;

export interface ProductEventTracker {
  track: (studioEvent: StudioProductEvent, options?: { onDelivered?: () => void }) => void;
}

/**
 * Sends each event once per page session through `send`. An event counts as
 * sent only once the backend accepted it, so one sent while offline or signed
 * out is sent again next time. Never throws.
 */
export function createProductEventTracker(send: SendProductEvent): ProductEventTracker {
  const pending = new Set<string>();
  const delivered = new Set<string>();

  return {
    track(studioEvent, { onDelivered } = {}) {
      const key = productEventKey(studioEvent);

      if (pending.has(key) || delivered.has(key)) {
        return;
      }

      pending.add(key);

      const settle = (status: number | null): void => {
        pending.delete(key);

        if (status !== null && status >= 200 && status < 300) {
          delivered.add(key);
          onDelivered?.();
        }
      };

      try {
        send(JSON.stringify(studioEvent)).then(settle, () => settle(null));
      } catch {
        settle(null);
      }
    },
  };
}

let tracker: ProductEventTracker | null = null;

/** Records an event when product events are on (see `installProductEvents`); otherwise does nothing. */
export function trackStudioEvent(studioEvent: StudioProductEvent): void {
  if (studioEvent.event === 'graph_opened' && !PROJECT_ID_PATTERN.test(studioEvent.projectId)) {
    return;
  }

  tracker?.track(studioEvent);
}

/** Session storage flag: this desktop app launch was recorded (page reloads keep it, a relaunch does not). */
export const DESKTOP_LAUNCH_STORAGE_KEY = 'flexkit:desktop-launch-recorded';

function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string): void {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    // Without session storage the backend's once-per-day count still applies.
  }
}

/**
 * Turns product events on for this environment and records the desktop app
 * launch (once per launch, once the user is signed in). Returns the function
 * that turns them off again.
 */
export function installProductEvents({ hosted }: { hosted: boolean }): () => void {
  if (!isStudioTelemetryEnabled({ hosted })) {
    return () => undefined;
  }

  const current = createProductEventTracker((body) =>
    postToUserApi(userApiPaths.productEvents, body, { keepalive: true })
  );
  const desktop = getDesktop();

  tracker = current;

  if (desktop && !readSessionFlag(DESKTOP_LAUNCH_STORAGE_KEY)) {
    current.track(
      { appVersion: desktop.version, event: 'desktop_app_opened', os: desktop.platform },
      { onDelivered: () => writeSessionFlag(DESKTOP_LAUNCH_STORAGE_KEY) }
    );
  }

  return () => {
    if (tracker === current) {
      tracker = null;
    }
  };
}
