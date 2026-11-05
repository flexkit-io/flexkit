import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getAutomationRunPath,
  getRunStatusLabel,
  summarizeRunSearch,
  uniquePastRuns,
  type PastRunResult,
} from '../../src/apps/ai/past-run-parts';

function run(overrides: Partial<PastRunResult> = {}): PastRunResult {
  return {
    automationId: 'a1',
    automationName: 'Lead follow-up',
    date: '2026-11-04',
    excerpt: 'Emailed 3 leads',
    runId: 'r1',
    status: 'success',
    ...overrides,
  };
}

describe('past run parts', () => {
  it('links to the run page of the automation', () => {
    assert.equal(getAutomationRunPath('my project', 'a/1', 'r1'), '/my%20project/ai/automations/a%2F1/runs/r1');
  });

  it('keeps one entry per run in rank order', () => {
    assert.deepEqual(
      uniquePastRuns([run(), run({ runId: 'r2' }), run({ excerpt: 'again' })]).map((entry) => entry.runId),
      ['r1', 'r2']
    );
    assert.deepEqual(uniquePastRuns(undefined), []);
  });

  it('summarizes the search and labels statuses', () => {
    assert.equal(summarizeRunSearch('leads', []), 'No past runs matched "leads"');
    assert.equal(summarizeRunSearch('leads', [run()]), '1 past run for "leads"');
    assert.equal(summarizeRunSearch('leads', [run(), run({ runId: 'r2' })]), '2 past runs for "leads"');
    assert.equal(summarizeRunSearch('', []), 'No finished runs yet');
    assert.equal(summarizeRunSearch('', [run()]), 'The latest run');
    assert.equal(summarizeRunSearch('', [run(), run({ runId: 'r2' })]), 'The 2 latest runs');
    assert.equal(getRunStatusLabel('failed'), 'Failed');
    assert.equal(getRunStatusLabel('running'), 'running');
    assert.equal(getRunStatusLabel('constructor'), 'constructor');
    assert.equal(summarizeRunSearch('  ', []), 'No finished runs yet');
  });
});
