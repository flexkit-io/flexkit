import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readUIMessageStream, type UIMessageChunk } from 'ai';
import { createResumableUiStream, LegacyStreamError } from '../../src/apps/ai/resumable-stream';

const frame = (index: number, chunk: UIMessageChunk | null) => JSON.stringify({ index, chunk }) + '\n';
function response(text: string) {
  return new Response(text, { headers: { 'x-flexkit-stream-version': '2' } });
}

it('reconnects mid-text and tool JSON without duplicate deltas or lost parser state', async () => {
  const urls: string[] = [];
  const chunks: UIMessageChunk[] = [
    { type: 'text-start', id: 'text' },
    { type: 'text-delta', id: 'text', delta: 'Hello ' },
    { type: 'text-delta', id: 'text', delta: 'world' },
    { type: 'text-end', id: 'text' },
    { type: 'tool-input-start', toolCallId: 't', toolName: 'search' },
    { type: 'tool-input-delta', toolCallId: 't', inputTextDelta: '{"query":' },
    { type: 'tool-input-delta', toolCallId: 't', inputTextDelta: '"books"}' },
    { type: 'tool-input-available', toolCallId: 't', toolName: 'search', input: { query: 'books' } },
    { type: 'tool-output-available', toolCallId: 't', output: 'found' },
    { type: 'finish', messageMetadata: { flexkitTerminal: true } },
  ];
  const batches = [
    chunks
      .slice(0, 2)
      .map((chunk, i) => frame(i, chunk))
      .join('') + '{"index":2,',
    chunks
      .slice(2, 6)
      .map((chunk, i) => frame(i + 2, chunk))
      .join(''),
    // Deliberately repeat the last accepted frame, as an at-least-once transport may.
    chunks
      .slice(5)
      .map((chunk, i) => frame(i + 5, chunk))
      .join(''),
  ];
  const stream = createResumableUiStream({
    url: '/stream?run=x',
    signal: new AbortController().signal,
    state: () => ({ terminal: false, paused: false }),
    onState: () => {},
    retryMs: 1,
    fetchStream: (async (url) => {
      urls.push(String(url));
      return response(batches.shift()!);
    }) as typeof fetch,
  });
  let final;
  for await (const message of readUIMessageStream({ stream, terminateOnError: true })) final = message;
  assert.match(urls[0]!, /startIndex=0$/);
  assert.match(urls[1]!, /startIndex=2$/);
  assert.match(urls[2]!, /startIndex=6$/);
  assert.equal(final?.parts.find((p) => p.type === 'text')?.text, 'Hello world');
  const tool = final?.parts.find((p) => p.type === 'tool-search') as { input: unknown; output: unknown };
  assert.deepEqual(tool.input, { query: 'books' });
  assert.equal(tool.output, 'found');
});

it('preserves json-render fence state across reconnects', async () => {
  const chunks: UIMessageChunk[] = [
    { type: 'text-start', id: 't' },
    { type: 'text-delta', id: 't', delta: 'Chart\n```spec\n{"op":"add","path":"/root","value":' },
    { type: 'text-delta', id: 't', delta: '"main"}\n```\nDone' },
    { type: 'text-end', id: 't' },
    { type: 'finish', messageMetadata: { flexkitTerminal: true } },
  ];
  const batches = [
    chunks
      .slice(0, 2)
      .map((c, i) => frame(i, c))
      .join(''),
    chunks
      .slice(2)
      .map((c, i) => frame(i + 2, c))
      .join(''),
  ];
  const stream = createResumableUiStream({
    url: '/stream',
    signal: new AbortController().signal,
    state: () => ({ terminal: false, paused: false }),
    onState: () => {},
    retryMs: 1,
    fetchStream: (async () => response(batches.shift()!)) as typeof fetch,
  });
  let final;
  for await (const message of readUIMessageStream({ stream, terminateOnError: true })) final = message;
  assert.ok(final?.parts.some((p) => p.type === 'data-spec'));
  assert.ok(
    !final?.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('')
      .includes('"op"')
  );
});

it('negotiates legacy fallback instead of feeding unindexed replay into a resumed parser', async () => {
  const stream = createResumableUiStream({
    url: '/old',
    signal: new AbortController().signal,
    state: () => ({ terminal: false, paused: false }),
    onState: () => {},
    fetchStream: (async () => new Response('data: {}\n\n')) as typeof fetch,
  });
  await assert.rejects(async () => {
    const reader = stream.getReader();
    try {
      while (!(await reader.read()).done) {
        /* drain */
      }
    } finally {
      reader.releaseLock();
    }
  }, LegacyStreamError);
});

it('cancellation stops retrying during an approval pause', async () => {
  const abort = new AbortController();
  let requests = 0;
  const stream = createResumableUiStream({
    url: '/pause',
    signal: abort.signal,
    state: () => ({ terminal: false, paused: true }),
    onState: (status) => {
      if (status === 'paused') abort.abort(new Error('cancelled'));
    },
    retryMs: 1,
    fetchStream: (async () => {
      requests++;
      return response('');
    }) as typeof fetch,
  });
  await assert.rejects(async () => {
    const reader = stream.getReader();
    try {
      while (!(await reader.read()).done) {
        /* drain */
      }
    } finally {
      reader.releaseLock();
    }
  });
  assert.equal(requests, 1);
});

it('resumes an approval pause from the same cursor when the record becomes running', async () => {
  let paused = true;
  const urls: string[] = [];
  const abort = new AbortController();
  const stream = createResumableUiStream({ url: '/approval', signal: abort.signal,
    state: () => ({ terminal: false, paused }), retryMs: 2,
    onState: status => { if (status === 'paused') setTimeout(() => { paused = false; }, 5); },
    fetchStream: (async url => {
      urls.push(String(url));
      return urls.length === 1
        ? response(frame(0, { type: 'data-mutation-approval', id: 'approval', data: { status: 'pending' } }))
        : response(frame(1, { type: 'data-mutation-approval', id: 'approval', data: { status: 'approved' } }) +
            frame(2, { type: 'finish', messageMetadata: { flexkitTerminal: true } }));
    }) as typeof fetch,
  });
  let final;
  for await (const message of readUIMessageStream({ stream, terminateOnError: true })) final = message;
  assert.match(urls[1]!, /startIndex=1$/);
  assert.equal(urls.length, 2);
  assert.equal(final?.parts.filter(p => p.type === 'data-mutation-approval').length, 1);
  assert.deepEqual((final?.parts[0] as { data: unknown }).data, { status: 'approved' });
});
