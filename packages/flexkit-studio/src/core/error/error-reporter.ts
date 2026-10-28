import { userApiPaths } from '../api-paths';
import { getDesktop } from '../desktop';
import { flexkitDomain } from '../domains';
import { getLocalStorage } from '../local-storage';
import { STUDIO_VERSION } from '../use-studio-version';

/**
 * Reports unexpected Studio errors (uncaught errors, unhandled rejections and
 * errors caught by the error boundaries) to Flexkit through the Studio's own
 * BFF (`/api/flexkit/-/client-errors`), which forwards the session so the
 * report is attributed to the signed-in user.
 *
 * Reports carry the error, the Studio path (no query string or hash) and the
 * current project id; never request bodies, form values or record data.
 */

export type ClientErrorSource = 'window' | 'unhandledrejection' | 'react' | 'manual';

export interface ClientError {
  source: ClientErrorSource;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  path?: string;
  projectId?: string;
  occurredAt: string;
}

export interface ClientErrorApp {
  platform: 'web' | 'desktop';
  version: string;
  userAgent?: string;
}

export interface ClientErrorReport {
  app: ClientErrorApp;
  errors: ClientError[];
}

/** Field limits of the backend schema. */
const LIMITS = {
  componentStack: 4_000,
  message: 2_000,
  name: 200,
  path: 500,
  stack: 8_000,
  userAgent: 500,
} as const;

/** The backend accepts 1 to 10 errors per report. */
export const MAX_ERRORS_PER_REPORT = 10;
/** The backend refuses bodies over 64 KB; `keepalive` requests share a 64 KB budget too. */
export const MAX_REPORT_BYTES = 60_000;
/** Reports kept per page session; anything after that is dropped. */
export const MAX_ERRORS_PER_SESSION = 50;
/** At most one report is sent per interval; errors in between are batched. */
export const FLUSH_INTERVAL_MS = 5_000;
/** Turns reporting on (`on`) or off (`off`) in this browser, whatever the environment. */
export const ERROR_REPORTING_STORAGE_KEY = 'flexkit:error-reporting';

const PROJECT_ID_PATTERN = /^[a-z0-9]{1,64}$/;

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/** The pathname of a path or URL, without query string or hash. */
export function toReportPath(pathOrUrl: string): string {
  let path = pathOrUrl;

  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(pathOrUrl)) {
      path = new URL(pathOrUrl).pathname;
    }
  } catch {
    // Not a URL; strip by hand below.
  }

  return truncate(path.split(/[?#]/)[0] ?? '', LIMITS.path);
}

export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
}

/**
 * Name, message and stack of anything thrown. A non-Error value (a rejected
 * promise with a plain object) is described by its type only, so record data
 * someone rejected with never leaves the browser.
 */
export function describeError(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: typeof error.message === 'string' ? error.message : '',
      stack: typeof error.stack === 'string' ? error.stack : undefined,
    };
  }

  if (typeof error === 'string') {
    return { name: 'Error', message: error };
  }

  if (error === null || error === undefined) {
    return { name: 'Error', message: `Non-Error thrown: ${String(error)}` };
  }

  if (typeof error === 'object') {
    const constructorName = (error as { constructor?: { name?: unknown } }).constructor?.name;

    return {
      name: 'Error',
      message: `Non-Error thrown: ${typeof constructorName === 'string' && constructorName ? constructorName : 'object'}`,
    };
  }

  return { name: 'Error', message: `Non-Error thrown: ${typeof error}` };
}

const NOISE_MESSAGES = [
  /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
  // Cross-origin script errors carry nothing to act on.
  /^Script error\.?$/i,
  /The (operation|user) (was )?aborted/i,
  /signal is aborted without reason/i,
];

const EXTENSION_URL = /\b(chrome|moz|safari(-web)?|ms-browser)-extension:\/\//i;

const EMAIL_ADDRESS = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Masks email addresses an error message may quote from a record or form. */
export function maskMessage(message: string): string {
  return message.replace(EMAIL_ADDRESS, '<email>');
}

/** Errors that are not Studio bugs: browser quirks, aborted requests, browser extensions. */
export function isNoiseError(details: ErrorDetails, sourceUrl?: string): boolean {
  if (details.name === 'AbortError') {
    return true;
  }

  if (NOISE_MESSAGES.some((pattern) => pattern.test(details.message))) {
    return true;
  }

  if (sourceUrl && EXTENSION_URL.test(sourceUrl)) {
    return true;
  }

  return Boolean(details.stack && EXTENSION_URL.test(details.stack));
}

export interface BuildClientErrorOptions {
  source: ClientErrorSource;
  componentStack?: string;
  path?: string;
  projectId?: string | null;
  /** The script the error came from (`ErrorEvent.filename`), checked for browser extensions. */
  sourceUrl?: string;
  now?: Date;
}

/** The report entry for an error, or null when it is noise. */
export function buildClientError(error: unknown, options: BuildClientErrorOptions): ClientError | null {
  const details = describeError(error);

  if (isNoiseError(details, options.sourceUrl)) {
    return null;
  }

  const entry: ClientError = {
    source: options.source,
    name: truncate(details.name, LIMITS.name),
    message: truncate(maskMessage(details.message), LIMITS.message),
    occurredAt: (options.now ?? new Date()).toISOString(),
  };

  if (details.stack) {
    entry.stack = truncate(details.stack, LIMITS.stack);
  }

  if (options.componentStack) {
    entry.componentStack = truncate(options.componentStack, LIMITS.componentStack);
  }

  if (options.path) {
    entry.path = toReportPath(options.path);
  }

  if (options.projectId && PROJECT_ID_PATTERN.test(options.projectId)) {
    entry.projectId = options.projectId;
  }

  return entry;
}

/** Identity of an error within a page session: the same message and stack are reported once. */
export function errorKey(error: Pick<ClientError, 'message' | 'name' | 'stack'>): string {
  return `${error.name}\n${error.message}\n${error.stack ?? ''}`;
}

const encoder = new TextEncoder();

function byteLength(value: string): number {
  return encoder.encode(value).length;
}

/**
 * Takes the errors that fit one report (at most 10 and `maxBytes` of JSON)
 * off the front of the queue. Returns the request body and how many errors it holds.
 */
export function buildReportBody(
  app: ClientErrorApp,
  queue: readonly ClientError[],
  maxBytes = MAX_REPORT_BYTES
): { body: string; count: number } | null {
  // The envelope plus each error once, joined by commas.
  let size = byteLength(JSON.stringify({ app, errors: [] } satisfies ClientErrorReport));
  const errors: ClientError[] = [];

  for (const error of queue.slice(0, MAX_ERRORS_PER_REPORT)) {
    const errorSize = byteLength(JSON.stringify(error)) + (errors.length ? 1 : 0);

    if (size + errorSize > maxBytes) {
      break;
    }

    size += errorSize;
    errors.push(error);
  }

  if (errors.length === 0) {
    return null;
  }

  return { body: JSON.stringify({ app, errors } satisfies ClientErrorReport), count: errors.length };
}

export interface ErrorReportingEnvironment {
  /** The Studio lists the signed-in user's projects (hosted Studio, desktop app). */
  hosted: boolean;
  isDesktop: boolean;
  domain: string;
  hostname: string;
  version: string;
  /** The `flexkit:error-reporting` setting in this browser, if any. */
  override: string | null;
}

const LOCAL_HOSTNAME = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$|\.(localhost|test|local)$/i;

/**
 * Reporting is on for the hosted Studio and the desktop app against the
 * production backend, and off in development: a local backend
 * (`flexkit.test`), a local host, or a build without a version. The
 * `flexkit:error-reporting` local storage setting forces it `on` or `off`.
 */
export function isErrorReportingEnabled(env: ErrorReportingEnvironment): boolean {
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

export type SendReport = (body: string, options: { unloading: boolean }) => Promise<number | null>;

export interface ErrorReporterOptions {
  app: ClientErrorApp;
  send: SendReport;
  /** The current Studio path; only its pathname is sent. */
  getPath?: () => string | undefined;
  now?: () => Date;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

export interface ErrorReporter {
  report: (error: unknown, options: Omit<BuildClientErrorOptions, 'path' | 'projectId' | 'now'>) => void;
  setProjectId: (projectId: string | null) => void;
  /** Sends the next report now; `unloading` uses a beacon or keepalive request that outlives the page. */
  flush: (options?: { unloading?: boolean }) => void;
  /** Errors waiting to be sent (tests). */
  pending: () => readonly ClientError[];
  dispose: () => void;
}

/** The queue, dedupe, cap and batching; the transport and the clock are injected. */
export function createErrorReporter({
  app,
  send,
  getPath,
  now = () => new Date(),
  setTimer = (callback, ms) => setTimeout(callback, ms),
  clearTimer = (timer) => clearTimeout(timer as ReturnType<typeof setTimeout>),
}: ErrorReporterOptions): ErrorReporter {
  const queue: ClientError[] = [];
  const seen = new Set<string>();
  let accepted = 0;
  let projectId: string | null = null;
  let timer: unknown = null;
  let stopped = false;

  function schedule(): void {
    if (timer === null && queue.length > 0 && !stopped) {
      timer = setTimer(() => {
        timer = null;
        flush();
      }, FLUSH_INTERVAL_MS);
    }
  }

  function sendNext(unloading: boolean): boolean {
    const next = buildReportBody(app, queue);

    if (!next) {
      // An error that cannot fit a report on its own; drop it.
      queue.shift();

      return queue.length > 0;
    }

    queue.splice(0, next.count);
    send(next.body, { unloading })
      .then((status) => {
        // Rate limited or not allowed: stop for this page session rather than retry.
        if (status === 401 || status === 403 || status === 429) {
          stopped = true;
          queue.length = 0;
        }
      })
      .catch(() => {
        // Never report the reporter's own failures.
      });

    return queue.length > 0;
  }

  function flush({ unloading = false }: { unloading?: boolean } = {}): void {
    try {
      if (stopped) {
        return;
      }

      if (timer !== null && unloading) {
        clearTimer(timer);
        timer = null;
      }

      // One report per flush, also when the page goes away: beacons and
      // keepalive requests share a 64 KB budget, so a second would be refused.
      if (queue.length > 0) {
        sendNext(unloading);
      }

      schedule();
    } catch {
      // Error reporting must never break the Studio.
    }
  }

  return {
    report(error, options) {
      try {
        if (stopped || accepted >= MAX_ERRORS_PER_SESSION) {
          return;
        }

        const entry = buildClientError(error, {
          ...options,
          now: now(),
          path: getPath?.(),
          projectId,
        });

        if (!entry) {
          return;
        }

        const key = errorKey(entry);

        if (seen.has(key)) {
          return;
        }

        seen.add(key);
        accepted += 1;
        queue.push(entry);
        schedule();
      } catch {
        // Error reporting must never break the Studio.
      }
    },
    setProjectId(id) {
      projectId = id;
    },
    flush,
    pending: () => queue,
    dispose() {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }

      stopped = true;
      queue.length = 0;
    },
  };
}

/** Sends a report through the BFF; a beacon when the page is going away on the web. */
export const sendReportToBff: SendReport = async (body, { unloading }) => {
  const url = userApiPaths.clientErrors;

  // A beacon outlives the page. The BFF reads its JSON body like a fetch's
  // and the browser sends the session cookie with it (same origin). The
  // desktop app's BFF only answers script requests, so it uses `keepalive`.
  if (unloading && !getDesktop() && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      // text/plain is CORS-safelisted, so no browser refuses the beacon; the body is still JSON.
      if (navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) {
        return null;
      }
    } catch {
      // Fall back to a keepalive fetch.
    }
  }

  const response = await fetch(url, {
    body,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    keepalive: unloading,
    method: 'POST',
  });

  return response.status;
};

let installed: ErrorReporter | null = null;

/** Reports an error caught by the Studio (an error boundary, for example). Does nothing when reporting is off. */
export function reportStudioError(
  error: unknown,
  { source = 'manual', componentStack }: { source?: ClientErrorSource; componentStack?: string } = {}
): void {
  installed?.report(error, { source, componentStack });
}

/** The project the Studio shows, added to reports; null outside a project. */
export function setErrorReportingProjectId(projectId: string | null): void {
  installed?.setProjectId(projectId);
}

function readOverride(): string | null {
  try {
    return getLocalStorage()?.getItem(ERROR_REPORTING_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Starts reporting uncaught errors and unhandled rejections when reporting is
 * enabled for this environment. Returns the function that stops it.
 */
export function installErrorReporter({ hosted }: { hosted: boolean }): () => void {
  if (typeof window === 'undefined' || installed) {
    return () => undefined;
  }

  const desktop = getDesktop();

  if (
    !isErrorReportingEnabled({
      hosted,
      isDesktop: Boolean(desktop),
      domain: flexkitDomain,
      hostname: window.location.hostname,
      version: STUDIO_VERSION,
      override: readOverride(),
    })
  ) {
    return () => undefined;
  }

  const reporter = createErrorReporter({
    app: {
      platform: desktop ? 'desktop' : 'web',
      version: STUDIO_VERSION,
      userAgent: truncate(navigator.userAgent, LIMITS.userAgent),
    },
    send: sendReportToBff,
    getPath: () => window.location.pathname,
  });

  function onError(event: ErrorEvent): void {
    reporter.report(event.error ?? event.message, { source: 'window', sourceUrl: event.filename });
  }

  function onUnhandledRejection(event: PromiseRejectionEvent): void {
    reporter.report(event.reason, { source: 'unhandledrejection' });
  }

  function onPageHide(): void {
    reporter.flush({ unloading: true });
  }

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.addEventListener('pagehide', onPageHide);
  installed = reporter;

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    window.removeEventListener('pagehide', onPageHide);
    reporter.flush({ unloading: true });
    reporter.dispose();

    if (installed === reporter) {
      installed = null;
    }
  };
}
