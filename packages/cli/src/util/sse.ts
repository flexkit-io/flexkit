export interface ServerSentEvent {
  event?: string;
  id?: string;
  data: string;
}

/**
 * Reads a `text/event-stream` (or newline-delimited JSON) response body and
 * yields one event per message. Lines without a `data:` field are kept as raw
 * data, so NDJSON streams work through the same reader.
 */
export async function* readEventStream(response: Response): AsyncGenerator<ServerSentEvent> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const isSse = (response.headers.get('content-type') ?? '').includes('text/event-stream');

  const parseBlock = (block: string): ServerSentEvent | null => {
    if (!isSse) {
      const data = block.trim();

      return data ? { data } : null;
    }

    const event: ServerSentEvent = { data: '' };
    const dataLines: string[] = [];

    for (const line of block.split('\n')) {
      if (line.startsWith(':')) {
        continue;
      }

      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');

      if (field === 'data') {
        dataLines.push(value);
      } else if (field === 'event') {
        event.event = value;
      } else if (field === 'id') {
        event.id = value;
      }
    }

    if (dataLines.length === 0) {
      return null;
    }

    event.data = dataLines.join('\n');

    return event;
  };

  const separator = isSse ? /\r?\n\r?\n/ : /\r?\n/;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(separator);
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      const event = parseBlock(block.replace(/\r/g, ''));

      if (event) {
        yield event;
      }
    }
  }

  buffer += decoder.decode();
  const last = parseBlock(buffer.replace(/\r/g, ''));

  if (last) {
    yield last;
  }
}

/** Parses an event's data as JSON, or returns null for `[DONE]` markers and non-JSON data. */
export function parseEventJson<T = unknown>(event: ServerSentEvent): T | null {
  if (!event.data || event.data === '[DONE]') {
    return null;
  }

  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}
