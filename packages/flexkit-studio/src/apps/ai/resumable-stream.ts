import type { UIMessageChunk } from 'ai';
import { pipeJsonRender } from '@json-render/core';

export class LegacyStreamError extends Error {}
class PermanentStreamError extends Error {}
type State = { terminal: boolean; paused: boolean };

/** Cursor and parser state have the same lifetime. Neither is reused alone.
 * A remount deliberately starts at zero; reconnects reuse both. */
export function createResumableUiStream({
  url,
  signal,
  state,
  onState,
  fetchStream = fetch,
  retryMs = 2000,
}: {
  url: string;
  signal: AbortSignal;
  state: () => State;
  onState: (status: 'streaming' | 'paused' | 'finished' | 'unavailable') => void;
  fetchStream?: typeof fetch;
  retryMs?: number;
}): ReadableStream<UIMessageChunk> {
  let cursor = 0;
  let failures = 0;
  const bridge = new TransformStream<UIMessageChunk, UIMessageChunk>();
  const writer = bridge.writable.getWriter();
  const local = new AbortController();
  void writer.closed.catch((error) => local.abort(error));
  const abort = () => {
    local.abort(signal.reason);
    void writer.abort(signal.reason).catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const wait = () =>
    new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        local.signal.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, retryMs);
      local.signal.addEventListener('abort', done, { once: true });
      if (local.signal.aborted) done();
    });

  async function pump() {
    try {
      await writer.write({ type: 'start' });
      while (!local.signal.aborted) {
        try {
          const response = await fetchStream(`${url}${url.includes('?') ? '&' : '?'}wire=2&startIndex=${cursor}`, {
            credentials: 'include',
            signal: local.signal,
          });
          if (response.status === 404) {
            onState('unavailable');
            await writer.close();
            return;
          }
          if (response.status === 401 || response.status === 403)
            throw new PermanentStreamError('Stream access denied');
          if (!response.ok || !response.body) throw new Error(`Stream request failed: ${response.status}`);
          if (response.headers.get('x-flexkit-stream-version') !== '2') {
            await response.body.cancel();
            throw new LegacyStreamError('Backend uses legacy replay');
          }
          onState('streaming');
          const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
          let partial = '';
          let complete = false;
          try {
            while (!local.signal.aborted) {
              const { value, done } = await reader.read();
              if (done) break;
              partial += value;
              let end: number;
              while ((end = partial.indexOf('\n')) >= 0) {
                const line = partial.slice(0, end);
                partial = partial.slice(end + 1);
                if (!line) continue;
                const frame = JSON.parse(line) as { index: number; chunk: UIMessageChunk | null };
                if (!Number.isSafeInteger(frame.index) || frame.index < 0) throw new Error('Invalid replay cursor');
                if (frame.index < cursor) continue; // Retry duplicates never enter the parser.
                if (frame.index !== cursor) throw new Error('Replay cursor gap');
                if (frame.chunk) await writer.write(frame.chunk);
                cursor = frame.index + 1;
                failures = 0;
                if (
                  frame.chunk?.type === 'finish' &&
                  (frame.chunk.messageMetadata as { flexkitTerminal?: boolean } | undefined)?.flexkitTerminal
                )
                  complete = true;
              }
              if (partial.length > 2_000_000) throw new Error('Oversized replay frame');
              if (complete) break;
            }
          } finally {
            await reader.cancel().catch(() => undefined);
            reader.releaseLock();
          }
          if (complete || (state().terminal && !partial)) {
            await writer.write({ type: 'finish' });
            await writer.close();
            onState('finished');
            return;
          }
        } catch (error) {
          if (
            local.signal.aborted ||
            error instanceof LegacyStreamError ||
            error instanceof PermanentStreamError ||
            ++failures >= 5
          )
            throw error;
          // Keep the same parser and last accepted cursor after a dropped or
          // truncated HTTP response. No partial frame advances the cursor.
        }
        do {
          onState(state().paused ? 'paused' : 'streaming');
          await wait();
        } while (!local.signal.aborted && state().paused && !state().terminal);
      }
    } catch (error) {
      await writer.abort(error).catch(() => undefined);
    } finally {
      signal.removeEventListener('abort', abort);
      writer.releaseLock();
    }
  }
  void pump(); // Lifetime owned by the returned stream and the abort signal.
  return pipeJsonRender(bridge.readable) as ReadableStream<UIMessageChunk>;
}
