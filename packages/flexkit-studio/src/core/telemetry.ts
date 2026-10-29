import { getDesktop } from './desktop';
import { flexkitDomain } from './domains';
import { getLocalStorage } from './local-storage';
import { STUDIO_VERSION } from './use-studio-version';

/**
 * The on/off decision and the transport shared by the Studio's error reports
 * (core/error/error-reporter.ts) and product events
 * (core/analytics/product-events.ts).
 */

/** Turns error reports and product events on (`on`) or off (`off`) in this browser, whatever the environment. */
export const TELEMETRY_STORAGE_KEY = 'flexkit:telemetry';
/** The key error reporting shipped with; still honoured. */
export const LEGACY_TELEMETRY_STORAGE_KEY = 'flexkit:error-reporting';

export interface TelemetryEnvironment {
  /** The Studio lists the signed-in user's projects (hosted Studio, desktop app). */
  hosted: boolean;
  isDesktop: boolean;
  domain: string;
  hostname: string;
  version: string;
  /** The local storage setting in this browser, if any. */
  override: string | null;
}

const LOCAL_HOSTNAME = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$|\.(localhost|test|local)$/i;

/**
 * On for the hosted Studio and the desktop app against the production
 * backend, and off in development: a local backend (`flexkit.test`), a local
 * host, or a build without a version. The local storage setting forces it
 * `on` or `off`.
 */
export function isTelemetryEnabled(env: TelemetryEnvironment): boolean {
  if (env.override === 'on') {
    return true;
  }

  if (env.override === 'off') {
    return false;
  }

  if (!env.hosted || env.domain !== 'flexkit.io' || env.version === '0.0.0') {
    return false;
  }

  return env.isDesktop || !LOCAL_HOSTNAME.test(env.hostname);
}

function readOverride(): string | null {
  try {
    const storage = getLocalStorage();

    return storage?.getItem(TELEMETRY_STORAGE_KEY) ?? storage?.getItem(LEGACY_TELEMETRY_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/** Whether this Studio sends error reports and product events to Flexkit. */
export function isStudioTelemetryEnabled({ hosted }: { hosted: boolean }): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return isTelemetryEnabled({
    hosted,
    isDesktop: Boolean(getDesktop()),
    domain: flexkitDomain,
    hostname: window.location.hostname,
    version: STUDIO_VERSION,
    override: readOverride(),
  });
}

/**
 * POSTs JSON to a user-level backend route through the Studio's server proxy,
 * which adds the session. `keepalive` lets the request outlive the page.
 * Returns the response status.
 */
export async function postToUserApi(path: string, body: string, { keepalive = false } = {}): Promise<number> {
  const response = await fetch(path, {
    body,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    keepalive,
    method: 'POST',
  });

  return response.status;
}
