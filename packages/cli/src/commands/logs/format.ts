/** Pure helpers for `flexkit logs`: time parsing, query building, rows and follow dedupe. */

export type LogType = 'api' | 'webhooks' | 'llm';

export const LOG_TYPES: readonly LogType[] = ['api', 'webhooks', 'llm'];

export const MAX_LIMIT = 500;

export interface ApiLogEntry {
  type: 'api-requests';
  timestamp: string;
  operation_name: string;
  status_code: number;
  duration_ms: number;
  country: string;
  city: string;
  browser: string;
  os: string;
  request_size_bytes: number;
  response_size_bytes: number;
}

export interface WebhookLogEntry {
  type: 'webhook-executions';
  timestamp: string;
  webhook_id: string;
  event_type: string;
  entity_name: string;
  url: string;
  http_method: string;
  was_successful: number;
  status_code: number;
  duration_ms: number;
  request_size_bytes: number;
  error_type: string;
  error_message: string;
}

export interface LlmLogEntry {
  type: 'llm-requests';
  timestamp: string;
  generation_id: string;
  gateway_model_id: string;
  provider: string;
  model_effort: string;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens: number;
  cached_input_tokens: number;
  total_tokens: number;
  actual_cost_micros: number;
  duration_ms: number;
  automation_id: string;
  automation_run_id: string;
}

export type LogEntry = ApiLogEntry | WebhookLogEntry | LlmLogEntry;

export interface LogsResponse {
  type: LogType;
  since: string;
  until: string;
  limit: number;
  data: LogEntry[];
  nextBefore: string | null;
}

const UNIT_MS: { [unit: string]: number } = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

const RELATIVE_PATTERN = /^(\d+(?:\.\d+)?)\s*(s|m|h|d|w)$/i;

/**
 * Parses `--since`/`--until`/`--before`: a duration back from now (`30s`,
 * `15m`, `1h`, `2d`, `1w`, `90m`), `now`, or an ISO 8601 date or date-time.
 * A date without a time zone is read as UTC.
 */
export function parseTimeArg(value: string, flag: string, now: number = Date.now()): Date {
  const trimmed = value.trim();

  if (trimmed.toLowerCase() === 'now') {
    return new Date(now);
  }

  const relative = RELATIVE_PATTERN.exec(trimmed);

  if (relative) {
    const amount = Number(relative[1]);
    const unit = UNIT_MS[(relative[2] as string).toLowerCase()] as number;

    return new Date(now - amount * unit);
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const hasTime = trimmed.includes('T') || trimmed.includes(' ');
    const normalized = trimmed.replace(' ', 'T');
    const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized);
    const date = new Date(hasTime && !hasZone ? `${normalized}Z` : normalized);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  throw new Error(
    `${flag} must be a duration such as 30m, 1h or 2d, or an ISO date-time such as 2026-11-03T10:00:00Z (got "${value}").`
  );
}

export interface LogsQueryOptions {
  type: LogType;
  since?: Date;
  until?: Date;
  before?: Date;
  limit?: number;
  operation?: string;
  status?: string;
  event?: string;
}

/** Validates the type-specific filters and builds the `/logs` query string. */
export function buildLogsQuery(options: LogsQueryOptions): string {
  const params = new URLSearchParams({ type: options.type });

  if (options.since) {
    params.set('since', options.since.toISOString());
  }

  if (options.until) {
    params.set('until', options.until.toISOString());
  }

  if (options.before) {
    params.set('before', options.before.toISOString());
  }

  if (options.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > MAX_LIMIT) {
      throw new Error(`--limit must be a whole number from 1 to ${String(MAX_LIMIT)}.`);
    }

    params.set('limit', String(options.limit));
  }

  if (options.operation) {
    if (options.type !== 'api') {
      throw new Error('--operation only applies to API request logs.');
    }

    params.set('operation', options.operation);
  }

  if (options.event) {
    const event = options.event.toLowerCase();

    if (options.type !== 'webhooks') {
      throw new Error('--event only applies to webhook logs.');
    }

    if (!['create', 'update', 'delete'].includes(event)) {
      throw new Error('--event must be create, update or delete.');
    }

    params.set('event', event);
  }

  if (options.status) {
    const status = options.status.toLowerCase();

    if (options.type === 'llm') {
      throw new Error('--status does not apply to LLM logs.');
    }

    if (options.type === 'api' && !/^[1-5]\d\d$/.test(status)) {
      throw new Error('--status must be an HTTP status code, such as 500, for API request logs.');
    }

    if (options.type === 'webhooks') {
      const normalized =
        status === 'success' || status === 'ok' ? 'succeeded' : status === 'failure' ? 'failed' : status;

      if (normalized !== 'succeeded' && normalized !== 'failed') {
        throw new Error('--status must be succeeded or failed for webhook logs.');
      }

      params.set('status', normalized);

      return params.toString();
    }

    params.set('status', status);
  }

  return params.toString();
}

/** Identity of an entry for --follow: its timestamp and every field. */
export function logEntryKey(entry: LogEntry): string {
  return JSON.stringify(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Entries of a fresh poll that were not printed yet, oldest first. `seen`
 * maps entry keys to their time and is updated in place.
 */
export function takeNewEntries(entries: LogEntry[], seen: Map<string, number>): LogEntry[] {
  const fresh: LogEntry[] = [];

  for (const entry of entries) {
    const key = logEntryKey(entry);

    if (!seen.has(key)) {
      seen.set(key, Date.parse(entry.timestamp));
      fresh.push(entry);
    }
  }

  return fresh.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

/** Forgets entries older than the next poll window, so `seen` stays small. */
export function pruneSeen(seen: Map<string, number>, windowStart: number): void {
  for (const [key, time] of seen) {
    if (time < windowStart) {
      seen.delete(key);
    }
  }
}

/** `2026-11-03T10:00:00.250Z` → `2026-11-03 10:00:00` in local time (or UTC). */
export function formatLogTime(timestamp: string, utc = false): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const pad = (value: number): string => String(value).padStart(2, '0');
  const parts = utc
    ? [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
      ]
    : [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
  const [year, month, day, hours, minutes, seconds] = parts as [number, number, number, number, number, number];

  return `${String(year)}-${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCost(micros: number): string {
  const dollars = micros / 1_000_000;

  if (dollars === 0) {
    return '$0';
  }

  return dollars < 0.01 ? `$${dollars.toFixed(4)}` : `$${dollars.toFixed(2)}`;
}

export const HEADERS: { [type in LogType]: string[] } = {
  api: ['TIME', 'OPERATION', 'STATUS', 'DURATION', 'SIZE', 'LOCATION'],
  webhooks: ['TIME', 'EVENT', 'STATUS', 'METHOD', 'DURATION', 'URL', 'ERROR'],
  llm: ['TIME', 'MODEL', 'TOKENS IN/OUT', 'COST', 'DURATION', 'AUTOMATION'],
};

function decodeCity(value: string): string {
  if (!value.includes('%') && !value.includes('+')) {
    return value;
  }

  try {
    return decodeURIComponent(value.replaceAll('+', ' '));
  } catch {
    return value;
  }
}

/** Plain-text table cells for one entry (the command colors the status). */
export function logEntryRow(entry: LogEntry, utc = false): string[] {
  const time = formatLogTime(entry.timestamp, utc);

  if (entry.type === 'webhook-executions') {
    const error = entry.was_successful
      ? ''
      : [entry.error_type, entry.error_message].filter(Boolean).join(': ') || 'failed';

    return [
      time,
      `${entry.event_type} ${entry.entity_name}`,
      String(entry.status_code),
      entry.http_method,
      `${String(entry.duration_ms)}ms`,
      entry.url,
      error,
    ];
  }

  if (entry.type === 'llm-requests') {
    return [
      time,
      entry.gateway_model_id,
      `${entry.input_tokens.toLocaleString('en-US')} / ${entry.output_tokens.toLocaleString('en-US')}`,
      formatCost(entry.actual_cost_micros),
      `${String(entry.duration_ms)}ms`,
      entry.automation_id,
    ];
  }

  const location = [decodeCity(entry.city), entry.country].filter((part) => part && part !== 'Unknown').join(', ');

  return [
    time,
    entry.operation_name,
    String(entry.status_code),
    `${String(entry.duration_ms)}ms`,
    formatBytes(entry.request_size_bytes + entry.response_size_bytes),
    location,
  ];
}

/** Whether an entry is an error (non-2xx/3xx API status, failed webhook). */
export function isErrorEntry(entry: LogEntry): boolean {
  if (entry.type === 'webhook-executions') {
    return !entry.was_successful;
  }

  if (entry.type === 'api-requests') {
    return entry.status_code >= 400 || entry.status_code === 0;
  }

  return false;
}

const TYPE_NAMES = ['api', 'requests', 'webhooks', 'webhook', 'llm'];
