/** Pure helpers for `flexkit webhooks`: flag parsing, request bodies and display. */

export const WEBHOOK_EVENTS = ['create', 'update', 'delete'] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
export const WEBHOOK_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export interface WebhookHeader {
  name: string;
  /** Null when the caller's role may not read it. */
  value: string | null;
}

/** A webhook as the API returns it. */
export interface WebhookDto {
  id: string;
  name: string;
  description: string;
  url: string;
  method: string;
  enabled: boolean;
  /** Empty means every entity. */
  entities: string[];
  events: WebhookEvent[];
  headers: WebhookHeader[];
  hasSecret: boolean;
  secret: string | null;
  createdAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  updatedAt: string | null;
  lastTriggeredAt: string | null;
  deliveries: { failed: number; successful: number; total: number };
}

/** The JSON body of `POST /webhooks` and `PATCH /webhooks/:id`. Only set fields are sent. */
export interface WebhookBody {
  name?: string;
  description?: string;
  url?: string;
  method?: string;
  enabled?: boolean;
  entities?: string[];
  events?: WebhookEvent[];
  headers?: { name: string; value: string }[];
  secret?: string;
}

/** The webhook flags a command received, already read from `arg`. */
export interface WebhookFlags {
  name?: string;
  description?: string;
  url?: string;
  method?: string;
  secret?: string;
  entities?: string[];
  allEntities?: boolean;
  on?: string[];
  headers?: string[];
  removeHeaders?: string[];
  disabled?: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isWebhookId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Splits repeatable flags that may also hold comma-separated values (`--on create,update`). */
function splitList(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

/** `--on create --on update`, `--on create,delete` or `--on all` → events in a stable order. */
export function parseEvents(values: string[]): WebhookEvent[] {
  const events = new Set<WebhookEvent>();

  for (const value of splitList(values)) {
    const event = value.toLowerCase();

    if (event === 'all') {
      WEBHOOK_EVENTS.forEach((entry) => events.add(entry));
      continue;
    }

    if (!(WEBHOOK_EVENTS as readonly string[]).includes(event)) {
      throw new Error(`Unknown event "${value}" for --on. Use create, update, delete or all.`);
    }

    events.add(event as WebhookEvent);
  }

  return WEBHOOK_EVENTS.filter((event) => events.has(event));
}

export function parseMethod(value: string): string {
  const method = value.trim().toUpperCase();

  if (!(WEBHOOK_METHODS as readonly string[]).includes(method)) {
    throw new Error(`Unknown method "${value}" for --method. Use ${WEBHOOK_METHODS.join(', ')}.`);
  }

  return method;
}

/** `Key=Value` or `Key: Value` → a header. The value may contain `=` and `:`. */
export function parseHeaderFlag(value: string): { name: string; value: string } {
  const match = /^\s*([^=:\s]+)\s*[=:]\s?(.*)$/.exec(value);

  if (!match?.[1]) {
    throw new Error(`Invalid --header "${value}". Use Key=Value, for example --header "Authorization=Bearer abc".`);
  }

  return { name: match[1], value: match[2] ?? '' };
}

/**
 * Applies `--header` and `--remove-header` over the stored headers. Names
 * match case-insensitively; `--header Key=` (empty value) also removes `Key`.
 */
export function mergeHeaders(
  current: WebhookHeader[],
  set: { name: string; value: string }[],
  remove: string[]
): { name: string; value: string }[] {
  const hidden = current.find((header) => header.value === null);

  if (hidden) {
    throw new Error(
      `The value of header "${hidden.name}" is hidden from your role, so the headers can't be changed. Ask an owner or developer.`
    );
  }

  const removed = new Set([...remove, ...set.filter((header) => !header.value).map((header) => header.name)]);
  const result = current.map((header) => ({ name: header.name, value: header.value as string }));

  for (const header of set.filter((entry) => entry.value)) {
    const index = result.findIndex((entry) => entry.name.toLowerCase() === header.name.toLowerCase());

    if (index === -1) {
      result.push(header);
    } else {
      result[index] = header;
    }
  }

  return result.filter((header) => ![...removed].some((name) => name.toLowerCase() === header.name.toLowerCase()));
}

/** Uses the URL's host as the default name (`https://erp.example.com/hook` → `erp.example.com`). */
export function defaultWebhookName(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** The body of `flexkit webhooks create`. Events default to every event. */
export function buildCreateBody(flags: WebhookFlags): WebhookBody {
  const url = flags.url?.trim();

  if (!url) {
    throw new Error('Pass --url with the address that receives the events.');
  }

  const headers = (flags.headers ?? []).map(parseHeaderFlag).filter((header) => header.value);
  const events = flags.on && flags.on.length > 0 ? parseEvents(flags.on) : [...WEBHOOK_EVENTS];
  const body: WebhookBody = {
    name: flags.name?.trim() || defaultWebhookName(url),
    url,
    enabled: !flags.disabled,
    events,
    entities: splitList(flags.entities ?? []),
    headers,
  };

  if (flags.method) {
    body.method = parseMethod(flags.method);
  }

  if (flags.description !== undefined) {
    body.description = flags.description;
  }

  if (flags.secret !== undefined) {
    body.secret = flags.secret;
  }

  return body;
}

/**
 * The body of `flexkit webhooks update`: only the flags passed. `--entity`
 * and `--on` replace the stored lists; headers are merged (see mergeHeaders).
 */
export function buildUpdateBody(flags: WebhookFlags, current: WebhookDto): WebhookBody {
  const body: WebhookBody = {};

  if (flags.name !== undefined) {
    body.name = flags.name;
  }

  if (flags.description !== undefined) {
    body.description = flags.description;
  }

  if (flags.url !== undefined) {
    body.url = flags.url.trim();
  }

  if (flags.method !== undefined) {
    body.method = parseMethod(flags.method);
  }

  if (flags.secret !== undefined) {
    body.secret = flags.secret;
  }

  if (flags.allEntities && flags.entities && flags.entities.length > 0) {
    throw new Error('Pass either --entity or --all-entities, not both.');
  }

  if (flags.allEntities) {
    body.entities = [];
  } else if (flags.entities && flags.entities.length > 0) {
    body.entities = splitList(flags.entities);
  }

  if (flags.on && flags.on.length > 0) {
    body.events = parseEvents(flags.on);
  }

  if ((flags.headers?.length ?? 0) > 0 || (flags.removeHeaders?.length ?? 0) > 0) {
    body.headers = mergeHeaders(current.headers, (flags.headers ?? []).map(parseHeaderFlag), flags.removeHeaders ?? []);
  }

  return body;
}

export function formatEvents(events: WebhookEvent[]): string {
  return events.length === WEBHOOK_EVENTS.length ? 'all' : events.join(',');
}

export function formatEntities(entities: string[]): string {
  return entities.length === 0 ? 'all' : entities.join(', ');
}

export function formatDeliveries(deliveries: WebhookDto['deliveries']): string {
  if (deliveries.total === 0) {
    return '0';
  }

  return deliveries.failed > 0
    ? `${String(deliveries.total)} (${String(deliveries.failed)} failed)`
    : String(deliveries.total);
}

/** Finds webhooks by id or by exact (case-insensitive) name. */
export function matchWebhooks(webhooks: WebhookDto[], idOrName: string): WebhookDto[] {
  if (isWebhookId(idOrName)) {
    return webhooks.filter((webhook) => webhook.id.toLowerCase() === idOrName.toLowerCase());
  }

  const wanted = idOrName.trim().toLowerCase();

  return webhooks.filter((webhook) => webhook.name.toLowerCase() === wanted);
}
