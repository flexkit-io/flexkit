import { userApiPaths } from '../api-paths';
import { getDesktop } from '../desktop';
import { isStudioTelemetryEnabled } from '../error/error-reporter';

/**
 * Product events only the Studio can see, sent to Flexkit through the
 * Studio's own server proxy (`/api/flexkit/-/product-events`) with the
 * session: the Graph app opened, the desktop app launched. They follow the
 * error reporter's on/off decision (hosted Studio and desktop app against
 * flexkit.io; never local development) and carry ids, the desktop app
 * version and the OS only.
 */
export type StudioProductEvent =
  | { event: 'graph_opened'; projectId: string }
  | { event: 'desktop_app_opened'; appVersion: string; os: 'darwin' | 'linux' | 'win32' };

/** Identity of an event within a page session; the backend also counts each once per day. */
export function productEventKey(studioEvent: StudioProductEvent): string {
  return studioEvent.event === 'graph_opened' ? `graph_opened:${studioEvent.projectId}` : studioEvent.event;
}

export type SendProductEvent = (body: string) => Promise<unknown>;

/** Sends each event once per page session through `send`; never throws. */
export function createProductEventTracker(send: SendProductEvent): (studioEvent: StudioProductEvent) => void {
  const sent = new Set<string>();

  return (studioEvent) => {
    const key = productEventKey(studioEvent);

    if (sent.has(key)) {
      return;
    }

    sent.add(key);

    try {
      void send(JSON.stringify(studioEvent)).catch(() => {
        // Analytics never surface to the user.
      });
    } catch {
      // Analytics never surface to the user.
    }
  };
}

const sendToBff: SendProductEvent = (body) =>
  fetch(userApiPaths.productEvents, {
    body,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

let tracker: ((studioEvent: StudioProductEvent) => void) | null = null;

/** Records an event when product events are on (see `installProductEvents`); otherwise does nothing. */
export function trackStudioEvent(studioEvent: StudioProductEvent): void {
  tracker?.(studioEvent);
}

/** Turns product events on for this environment and records a desktop app launch. */
export function installProductEvents({ hosted }: { hosted: boolean }): void {
  if (tracker || !isStudioTelemetryEnabled({ hosted })) {
    return;
  }

  tracker = createProductEventTracker(sendToBff);

  const desktop = getDesktop();

  if (desktop) {
    trackStudioEvent({ appVersion: desktop.version, event: 'desktop_app_opened', os: desktop.platform });
  }
}
