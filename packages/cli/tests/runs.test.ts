import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import chalk from 'chalk';
import { createRunEventRenderer, isTerminalFinish, runStreamPath } from '../src/commands/runs/stream';
import { formatBytes, formatDuration } from '../src/commands/runs/format';
import { pageParams, runsListPath, uniqueFilePath } from '../src/commands/runs/index';
import { renderTranscript } from '../src/commands/runs/transcript';

chalk.level = 0;

describe('createRunEventRenderer', () => {
  it('renders text, tool calls, approvals and the summary', () => {
    const render = createRunEventRenderer();
    const out = [
      { type: 'start' },
      { type: 'data-user-message', data: { parts: [{ type: 'text', text: 'Manual run' }] } },
      { type: 'text-start', id: '1' },
      { type: 'text-delta', id: '1', delta: 'Checking ' },
      { type: 'text-delta', id: '1', delta: 'stock' },
      { type: 'tool-input-start', toolCallId: 'c1', toolName: 'executeGraphqlQuery' },
      {
        type: 'tool-input-available',
        toolCallId: 'c1',
        toolName: 'executeGraphqlQuery',
        input: { query: '{ products { _id } }' },
      },
      { type: 'tool-output-available', toolCallId: 'c1', output: { count: 3 } },
      { type: 'tool-output-error', toolCallId: 'c1', errorText: 'boom' },
      {
        type: 'data-mutation-approval',
        data: { approvalId: 'ap1', operationsSummary: 'Update 3 products', status: 'pending' },
      },
      { type: 'text-delta', id: '2', delta: 'Done.' },
      { type: 'text-end', id: '2' },
      { type: 'data-run-summary', data: { status: 'success', summary: 'All good.' } },
      { type: 'finish' },
    ]
      .map(render)
      .join('');

    assert.equal(
      out,
      [
        'Input: Manual run',
        'Checking stock',
        '→ executeGraphqlQuery {"query":"{ products { _id } }"}',
        '  ✓ executeGraphqlQuery {"count":3}',
        '  ✗ executeGraphqlQuery: boom',
        '⏸ Waiting for approval ap1: Update 3 products',
        'Done.',
        '● Run success',
        'All good.',
        '',
      ].join('\n')
    );
  });
});

describe('isTerminalFinish', () => {
  it('only accepts the durable finish marker', () => {
    assert.equal(isTerminalFinish({ type: 'finish', messageMetadata: { flexkitTerminal: true } }), true);
    assert.equal(isTerminalFinish({ type: 'finish' }), false);
    assert.equal(isTerminalFinish(null), false);
  });
});

describe('paths', () => {
  it('builds the indexed stream path', () => {
    assert.equal(runStreamPath('wrun_01', 42), '/automations/runs/wrun_01/stream?wire=2&startIndex=42');
  });

  it('builds the list paths', () => {
    assert.equal(runsListPath({ limit: 20, offset: 0, mine: true }), '/automations/runs?limit=20&offset=0&scope=mine');
    assert.equal(
      runsListPath({ automationId: 'a 1', limit: 5, offset: 10, mine: true }),
      '/automations/a%201/runs?limit=5&offset=10'
    );
  });

  it('clamps paging flags', () => {
    assert.deepEqual(pageParams({ '--limit': 1000, '--offset': -3 }, 20), { limit: 100, offset: 0 });
    assert.deepEqual(pageParams({}, 20), { limit: 20, offset: 0 });
  });
});

describe('formatting', () => {
  it('formats durations and sizes', () => {
    assert.equal(formatDuration('2026-11-01T10:00:00Z', '2026-11-01T10:00:42Z'), '42s');
    assert.equal(formatDuration('2026-11-01T10:00:00Z', '2026-11-01T10:01:23Z'), '1m 23s');
    assert.equal(formatDuration('2026-11-01T10:00:00Z', '2026-11-01T12:05:00Z'), '2h 5m');
    assert.equal(formatDuration('2026-11-01T10:00:00Z', null), '');
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(20 * 1024 * 1024), '20 MB');
  });
});

describe('uniqueFilePath', () => {
  it('never overwrites and strips directories from the name', () => {
    const taken = new Set(['/out/report.pdf', '/out/report (1).pdf']);

    assert.equal(
      uniqueFilePath('/out', 'report.pdf', (file) => taken.has(file)),
      '/out/report (2).pdf'
    );
    assert.equal(
      uniqueFilePath('/out', '../../etc/passwd', () => false),
      '/out/passwd'
    );
  });
});

describe('renderTranscript', () => {
  it('renders roles, text, tool calls and results', () => {
    const text = renderTranscript([
      { role: 'user', content: 'Run now' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Looking.' },
          { type: 'tool-call', toolName: 'search', input: { q: 'x' } },
        ],
      },
      {
        role: 'tool',
        content: [{ type: 'tool-result', toolName: 'search', output: { type: 'text', value: 'found' } }],
      },
    ]);

    assert.match(text, /^USER\nRun now\n/);
    assert.match(text, /ASSISTANT\nLooking\.\n→ search\n {2}\{/);
    assert.match(text, /TOOL\n← search\n {2}found/);
  });
});
