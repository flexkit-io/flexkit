import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPrompt,
  createChatRenderer,
  formatTranscript,
  previewToolInput,
  resolveChatMode,
  SPEC_NOTICE,
  stripSpecFences,
  toQuestionAnswers,
  type ChatChunk,
  type ChatMessage,
  type RenderAction,
} from '../src/commands/chat/render';

const CHAT_ID = '3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13';

function run(chunks: ChatChunk[]): RenderAction[] {
  const renderer = createChatRenderer();

  return [...chunks.flatMap((chunk) => renderer.push(chunk)), ...renderer.flush()];
}

function stdout(actions: RenderAction[]): string {
  return actions
    .filter((action): action is { kind: 'text'; text: string } => action.kind === 'text')
    .map((action) => action.text)
    .join('');
}

describe('createChatRenderer', () => {
  it('streams text deltas to stdout and ends with a newline', () => {
    const actions = run([
      { type: 'start' },
      { type: 'text-start', id: '1' },
      { type: 'text-delta', id: '1', delta: 'Hello ' },
      { type: 'text-delta', id: '1', delta: 'world' },
      { type: 'text-end', id: '1' },
      { type: 'finish', messageMetadata: { flexkitTerminal: true } },
    ]);

    assert.equal(stdout(actions), 'Hello world\n');
    assert.deepEqual(actions.at(-1), { kind: 'finish', aborted: false });
  });

  it('breaks the line before a tool call and names the tool with its input', () => {
    const actions = run([
      { type: 'text-start', id: '1' },
      { type: 'text-delta', id: '1', delta: 'Let me check' },
      { type: 'tool-input-start', toolCallId: 't1', toolName: 'executeGraphqlQuery' },
      { type: 'tool-input-available', toolCallId: 't1', input: { query: '{ products { name } }' } },
      { type: 'tool-output-available', toolCallId: 't1', output: { data: {} } },
    ]);

    assert.deepEqual(
      actions.map((action) => action.kind),
      ['text', 'text', 'tool']
    );
    assert.equal(stdout(actions), 'Let me check\n');
    assert.deepEqual(actions[2], { kind: 'tool', text: 'executeGraphqlQuery {"query":"{ products { name } }"}' });
  });

  it('separates text blocks around tool calls with a blank line', () => {
    const actions = run([
      { type: 'text-start', id: '1' },
      { type: 'text-delta', id: '1', delta: 'First.\n' },
      { type: 'text-end', id: '1' },
      { type: 'tool-input-available', toolCallId: 't1', toolName: 'searchSchema', input: {} },
      { type: 'text-start', id: '2' },
      { type: 'text-delta', id: '2', delta: 'Second.' },
      { type: 'text-end', id: '2' },
    ]);

    assert.equal(stdout(actions), 'First.\n\nSecond.\n');
  });

  it('reports tool errors with the tool name from its start chunk', () => {
    const actions = run([
      { type: 'tool-input-start', toolCallId: 't1', toolName: 'runGraphqlMutation' },
      { type: 'tool-output-error', toolCallId: 't1', errorText: 'Field "price" is required' },
    ]);

    assert.deepEqual(actions, [{ kind: 'error', text: 'runGraphqlMutation failed: Field "price" is required' }]);
  });

  it('hides ```spec fences split across deltas and prints a notice once', () => {
    const actions = run([
      { type: 'text-delta', id: '1', delta: 'Here is the chart:\n``' },
      { type: 'text-delta', id: '1', delta: '`spec\n{"op":"add","path":"/root","value":"c"}\n' },
      { type: 'text-delta', id: '1', delta: '{"op":"add"}\n``' },
      { type: 'text-delta', id: '1', delta: '`\nDone.' },
      { type: 'text-end', id: '1' },
    ]);

    assert.equal(stdout(actions), 'Here is the chart:\nDone.\n');
    assert.deepEqual(
      actions.filter((action) => action.kind === 'info'),
      [{ kind: 'info', text: SPEC_NOTICE }]
    );
  });

  it('keeps ordinary code fences', () => {
    const actions = run([{ type: 'text-delta', id: '1', delta: '```graphql\n{ products { name } }\n```\n' }]);

    assert.equal(stdout(actions), '```graphql\n{ products { name } }\n```\n');
  });

  it('asks a pending question once and tracks its later status', () => {
    const renderer = createChatRenderer();
    const question = {
      questionId: 'q1',
      questions: [
        {
          header: 'Format',
          multiSelect: false,
          options: [{ label: 'CSV', description: '' }],
          question: 'Which format?',
        },
      ],
      status: 'pending',
    };
    const first = renderer.push({ type: 'data-user-question', id: 'q1', data: question });
    const again = renderer.push({ type: 'data-user-question', id: 'q1', data: question });

    assert.equal(first.length, 1);
    assert.equal(first[0]?.kind, 'question');
    assert.deepEqual(again, []);
    assert.equal(renderer.isQuestionPending('q1'), true);

    renderer.push({ type: 'data-user-question', id: 'q1', data: { ...question, status: 'answered' } });
    assert.equal(renderer.isQuestionPending('q1'), false);
  });

  it('surfaces approvals, their decisions and produced files', () => {
    const renderer = createChatRenderer();
    const approval = { approvalId: 'a1', operationsSummary: 'Update 3 products', status: 'pending' };

    assert.equal(renderer.push({ type: 'data-mutation-approval', data: approval })[0]?.kind, 'approval');
    assert.equal(renderer.isApprovalPending('a1'), true);
    assert.deepEqual(renderer.push({ type: 'data-mutation-approval', data: { ...approval, status: 'executed' } }), [
      { kind: 'info', text: 'Change executed: Update 3 products' },
    ]);
    assert.deepEqual(
      renderer.push({
        type: 'data-run-artifact',
        data: { filename: 'orders.csv', status: 'done', url: 'https://files.flexkit.io/orders.csv' },
      }),
      [{ kind: 'info', text: 'File orders.csv: https://files.flexkit.io/orders.csv' }]
    );
  });

  it('marks the turn failed on a turn error and finishes on abort', () => {
    const renderer = createChatRenderer();

    assert.deepEqual(renderer.push({ type: 'data-turn-error', data: { message: 'Out of credits' } }), [
      { kind: 'error', text: 'Out of credits' },
    ]);
    assert.equal(renderer.failed(), true);
    assert.deepEqual(renderer.push({ type: 'abort' }).at(-1), { kind: 'finish', aborted: true });
  });

  it('ignores reasoning, steps and metadata', () => {
    assert.deepEqual(
      run([
        { type: 'start-step' },
        { type: 'reasoning-delta', id: 'r', delta: 'thinking' },
        { type: 'message-metadata' },
      ]),
      []
    );
  });
});

describe('previewToolInput and stripSpecFences', () => {
  it('previews inputs on one line and truncates', () => {
    assert.equal(previewToolInput({}), '');
    assert.equal(previewToolInput(undefined), '');
    assert.equal(previewToolInput({ query: 'a\n  b' }), '{"query":"a\\n b"}');
    assert.equal(previewToolInput({ text: 'x'.repeat(100) }, 20).length, 20);
  });

  it('replaces finished spec fences with a notice', () => {
    assert.equal(stripSpecFences('Intro\n```spec\n{"op":"add"}\n```\nOutro'), `Intro\n[${SPEC_NOTICE}]\nOutro`);
  });
});

describe('resolveChatMode', () => {
  const shapes = [
    { names: ['ls', 'list'], args: 'none' as const },
    { names: ['show', 'stop', 'rm', 'remove'], args: 'id' as const },
    { names: ['rename'], args: 'id+text' as const },
  ];

  it('runs a subcommand when the words fit it', () => {
    assert.deepEqual(resolveChatMode(['ls'], shapes), { mode: 'subcommand', name: 'ls' });
    assert.deepEqual(resolveChatMode(['show', CHAT_ID], shapes), { mode: 'subcommand', name: 'show' });
    assert.deepEqual(resolveChatMode(['rename', CHAT_ID, 'Q3', 'prices'], shapes), {
      mode: 'subcommand',
      name: 'rename',
    });
    assert.deepEqual(resolveChatMode(['stop'], shapes, { help: true }), { mode: 'subcommand', name: 'stop' });
  });

  it('treats natural language as a prompt', () => {
    assert.deepEqual(resolveChatMode(['show me the top products'], shapes), { mode: 'prompt' });
    assert.deepEqual(resolveChatMode(['show', 'me', 'the', 'sales'], shapes), { mode: 'prompt' });
    assert.deepEqual(resolveChatMode(['ls', 'the', 'products'], shapes), { mode: 'prompt' });
    assert.deepEqual(resolveChatMode(['stop', 'everything'], shapes), { mode: 'prompt' });
    assert.deepEqual(resolveChatMode([], shapes), { mode: 'prompt' });
  });
});

describe('buildPrompt and toQuestionAnswers', () => {
  it('joins words, accepts --message, and refuses both', () => {
    assert.deepEqual(buildPrompt(['top', 'products'], undefined), { prompt: 'top products' });
    assert.deepEqual(buildPrompt([], 'ls the products'), { prompt: 'ls the products' });
    assert.deepEqual(buildPrompt([], undefined), { prompt: null });
    assert.ok('error' in buildPrompt(['a'], 'b'));
  });

  it('keeps own words only when given', () => {
    assert.deepEqual(toQuestionAnswers([{ selected: ['CSV'] }, { selected: [], other: '  weekly ' }]), [
      { selected: ['CSV'] },
      { other: 'weekly', selected: [] },
    ]);
  });
});

describe('formatTranscript', () => {
  const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
    createdAt: '2026-11-03T10:00:00Z',
    error: null,
    id: 'm',
    parts: [],
    role: 'user',
    status: 'complete',
    textContent: '',
    workflowRunId: null,
    ...overrides,
  });

  it('prints messages with their tool calls, files and statuses', () => {
    const text = formatTranscript([
      message({ parts: [{ type: 'text', text: 'Export the orders' }], textContent: 'Export the orders' }),
      message({
        role: 'assistant',
        parts: [
          { type: 'step-start' },
          { type: 'tool-exportRecords', state: 'output-available', input: { format: 'csv' } },
          { type: 'data-run-artifact', data: { filename: 'orders.csv', url: 'https://f/o.csv', status: 'done' } },
          { type: 'text', text: 'Here is the file.' },
        ],
      }),
      message({ role: 'assistant', status: 'failed', error: 'Out of credits', textContent: '' }),
    ]);

    assert.equal(
      text,
      [
        'You · 2026-11-03T10:00:00Z',
        'Export the orders',
        '',
        'Agent · 2026-11-03T10:00:00Z',
        '› exportRecords {"format":"csv"}',
        '[file] orders.csv: https://f/o.csv',
        'Here is the file.',
        '',
        'Agent · 2026-11-03T10:00:00Z · failed',
        'Out of credits',
      ].join('\n')
    );
  });

  it('falls back to textContent and labels monitor messages', () => {
    const text = formatTranscript([message({ kind: 'monitor_event', textContent: 'Import finished', parts: null })]);

    assert.equal(text, 'Monitor · 2026-11-03T10:00:00Z\nImport finished');
  });
});
