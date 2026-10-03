import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReplayMessage, ReplayMessagePart } from '../src/replay';
import {
  getCommittedReasoningText,
  getLiveStatusLabel,
  getReasoningStatusLabel,
  getRollingStatusError,
  isHiddenReplayPart,
  stripInlineMarkdown,
  truncateLabel,
} from '../src/status-label';

function message(parts: ReplayMessagePart[]): ReplayMessage {
  return { id: 'm', parts, role: 'assistant' };
}

function dataPart(type: string, data: unknown): ReplayMessagePart {
  return { data, type } as ReplayMessagePart;
}

describe('getCommittedReasoningText', () => {
  it('is empty until a boundary is reached', () => {
    assert.equal(getCommittedReasoningText('I need to check the sch'), '');
  });

  it('commits at the last line break', () => {
    assert.equal(getCommittedReasoningText('**Planning**\n\nI need'), '**Planning**\n\n');
  });

  it('commits at a sentence end when it comes after the last line break', () => {
    assert.equal(getCommittedReasoningText('First line\nThe schema is ready. Then I'), 'First line\nThe schema is ready.');
  });

  it('accepts question and exclamation marks as terminators', () => {
    assert.equal(getCommittedReasoningText('Is it ready? Maybe'), 'Is it ready?');
    assert.equal(getCommittedReasoningText('Done! Next'), 'Done!');
  });

  it('ignores a terminator with no whitespace after it', () => {
    assert.equal(getCommittedReasoningText('Version 2.5 of the'), '');
  });
});

describe('getReasoningStatusLabel', () => {
  it('uses the latest committed bold heading', () => {
    assert.equal(getReasoningStatusLabel('**Planning the search**\n\nI need', { streaming: true }), 'Planning the search');
  });

  it('uses the first sentence of the latest committed paragraph', () => {
    assert.equal(
      getReasoningStatusLabel('**Planning**\n\nI need to check the schema. Then I will', { streaming: true }),
      'I need to check the schema'
    );
  });

  it('does not change while a sentence is still streaming', () => {
    const before = getReasoningStatusLabel('I need to check the schema. Then I', { streaming: true });
    const after = getReasoningStatusLabel('I need to check the schema. Then I will look at the', { streaming: true });

    assert.equal(before, 'I need to check the schema');
    assert.equal(after, before);
  });

  it('uses the whole text once the reasoning is done', () => {
    assert.equal(getReasoningStatusLabel('Looking at the trailing line', { streaming: false }), 'Looking at the trailing line');
  });

  it('strips markdown headings, lists, links, and emphasis', () => {
    assert.equal(getReasoningStatusLabel('# Checking *the* [docs](https://x.y)\n', { streaming: true }), 'Checking the docs');
    assert.equal(getReasoningStatusLabel('- Reading `config.json`\n', { streaming: true }), 'Reading config.json');
  });

  it('returns null for empty or placeholder reasoning', () => {
    assert.equal(getReasoningStatusLabel('', { streaming: true }), null);
    assert.equal(getReasoningStatusLabel('Reasoning.\n', { streaming: true }), null);
    assert.equal(getReasoningStatusLabel('   \n', { streaming: false }), null);
  });

  it('truncates long lines at a word boundary with an ellipsis', () => {
    const line = 'The quick brown fox jumps over the lazy dog while the sleepy cat watches from the windowsill all afternoon\n';
    const label = getReasoningStatusLabel(line, { streaming: true });

    assert.ok(label);
    assert.ok(label.length <= 73);
    assert.ok(label.endsWith('…'));
    assert.ok(!label.slice(0, -1).endsWith(' '));
    assert.ok(label.slice(0, -1).split(' ').every((word) => line.includes(word)));
  });
});

describe('truncateLabel and stripInlineMarkdown', () => {
  it('keeps short labels as-is', () => {
    assert.equal(truncateLabel('Short'), 'Short');
  });

  it('cuts without a word boundary when the last space is too early', () => {
    assert.equal(truncateLabel(`a ${'b'.repeat(100)}`, 10), 'a bbbbbbbb…');
  });

  it('drops trailing punctuation', () => {
    assert.equal(stripInlineMarkdown('**Next step:**'), 'Next step');
  });
});

describe('getLiveStatusLabel', () => {
  it('skips step markers and uses streaming reasoning', () => {
    const label = getLiveStatusLabel(
      message([
        { state: 'streaming', text: '**Reading mail**\n', type: 'reasoning' },
        { type: 'step-start' },
      ])
    );

    assert.equal(label, 'Reading mail');
  });

  it('returns null once reasoning is done or text is streaming', () => {
    assert.equal(getLiveStatusLabel(message([{ state: 'done', text: 'Done.', type: 'reasoning' }])), null);
    assert.equal(getLiveStatusLabel(message([{ state: 'streaming', text: 'Hello', type: 'text' }])), null);
    assert.equal(getLiveStatusLabel(undefined), null);
  });

  it('names a pending approval and in-flight tool calls', () => {
    assert.equal(
      getLiveStatusLabel(message([dataPart('data-mutation-approval', { approvalId: 'a', operationsSummary: 'x', status: 'pending' })])),
      'Awaiting approval'
    );
    assert.equal(
      getLiveStatusLabel(message([dataPart('data-mutation-approval', { approvalId: 'a', operationsSummary: 'x', status: 'executed' })])),
      null
    );
    assert.equal(
      getLiveStatusLabel(message([dataPart('data-web-search', { query: 'flexkit', status: 'loading' })])),
      'Searching the web for "flexkit"'
    );
    assert.equal(getLiveStatusLabel(message([dataPart('data-web-search', { query: 'flexkit', status: 'done' })])), null);
    assert.equal(
      getLiveStatusLabel(message([dataPart('data-plugin-call', { pluginId: 'gmail', status: 'loading', tool: 'search_threads' })])),
      'Calling gmail: search threads'
    );
    assert.equal(
      getLiveStatusLabel(message([dataPart('data-run-command', { args: ['-la'], command: 'ls', sandboxId: 's', status: 'running' })])),
      'Running ls -la'
    );
    assert.equal(getLiveStatusLabel(message([dataPart('data-load-skill', { skillName: 'Reports', status: 'loading' })])), 'Loading skill "Reports"');
    assert.equal(
      getLiveStatusLabel(message([dataPart('data-subtask', { status: 'running', subtaskId: 's', title: 'Check invoices' })])),
      'Running subtask: Check invoices'
    );
    assert.equal(getLiveStatusLabel(message([dataPart('data-subtask', { status: 'done', subtaskId: 's', title: 'Check invoices' })])), null);
  });
});

describe('plan labels', () => {
  const plan = dataPart('data-plan', {
    steps: [
      { status: 'completed', step: 'Fetch threads' },
      { status: 'in_progress', step: 'Classify by urgency' },
      { status: 'pending', step: 'Write brief' },
    ],
    updatedAt: 'now',
  });

  it('fills gaps with the current plan step and yields to tool labels', () => {
    assert.equal(getLiveStatusLabel(message([plan])), 'Step 2 of 3: Classify by urgency');
    assert.equal(getLiveStatusLabel(message([plan, { state: 'done', text: 'r', type: 'reasoning' }])), 'Step 2 of 3: Classify by urgency');
    assert.equal(
      getLiveStatusLabel(message([plan, dataPart('data-search-schema', { status: 'loading' })])),
      'Searching schema'
    );
    assert.equal(getLiveStatusLabel(message([plan, dataPart('data-search-schema', { status: 'done' })])), 'Step 2 of 3: Classify by urgency');
    assert.equal(isHiddenReplayPart(plan), true);
    assert.equal(getRollingStatusError(plan), null);
  });
});

describe('isHiddenReplayPart and getRollingStatusError', () => {
  const jevReason = 'Approved by Flexkit Jev policy (clear=0.990).';

  it('hides reasoning, step markers, and successful rolling-status calls', () => {
    assert.equal(isHiddenReplayPart({ state: 'done', text: 'Why', type: 'reasoning' }), true);
    assert.equal(isHiddenReplayPart({ type: 'step-start' }), true);
    assert.equal(isHiddenReplayPart(dataPart('data-search-schema', { status: 'done' })), true);
    assert.equal(isHiddenReplayPart(dataPart('data-plugin-call', { pluginId: 'gmail', status: 'done', tool: 't' })), true);
  });

  it('shows failed rolling-status calls with their error', () => {
    const failed = dataPart('data-run-command', { args: [], command: 'npm test', sandboxId: 's', status: 'error' });

    assert.equal(isHiddenReplayPart(failed), false);
    assert.equal(getRollingStatusError(failed), 'Command failed: npm test');
    assert.equal(
      getRollingStatusError(dataPart('data-web-search', { error: { message: 'Rate limited' }, query: 'q', status: 'error' })),
      'Rate limited'
    );
    assert.equal(getRollingStatusError(dataPart('data-web-search', { query: 'q', status: 'done' })), null);
    assert.equal(getRollingStatusError({ state: 'done', text: 'x', type: 'text' }), null);
  });

  it('hides Jev-cleared plugin calls unless they failed, and keeps human decisions', () => {
    const base = { approvalId: 'a', operationsSummary: 'Call gmail: search_threads' };

    assert.equal(isHiddenReplayPart(dataPart('data-mutation-approval', { ...base, reason: jevReason, status: 'executed' })), true);
    assert.equal(isHiddenReplayPart(dataPart('data-mutation-approval', { ...base, reason: jevReason, status: 'error' })), false);
    assert.equal(
      isHiddenReplayPart(dataPart('data-mutation-approval', { ...base, decidedBy: 'member', reason: jevReason, status: 'executed' })),
      false
    );
    assert.equal(isHiddenReplayPart(dataPart('data-mutation-approval', { ...base, status: 'pending' })), false);
  });

  it('keeps every other part', () => {
    assert.equal(isHiddenReplayPart({ state: 'done', text: 'Hi', type: 'text' }), false);
    assert.equal(isHiddenReplayPart(dataPart('data-run-summary', { status: 'success', summary: 'ok' })), false);
  });
});
