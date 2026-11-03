import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildUsageRows, formatAmount, monthRange } from '../src/commands/usage/rows';

describe('usage rows', () => {
  it('pairs usage with limits and computes percentages', () => {
    const rows = buildUsageRows(
      { apiRequests: 8000, databaseSize: 0.25, storage: 0, nodes: 100, webhooks: 1, projectUsers: 3, agentUsage: null },
      { apiRequests: 10000, databaseSize: 0.5, storage: 1, nodes: 0, webhooks: 5, projectUsers: 3 },
      false
    );

    assert.deepEqual(
      rows.map((row) => [row.metric, row.used, row.limit, row.percent]),
      [
        ['apiRequests', 8000, 10000, 80],
        ['databaseSize', 0.25, 0.5, 50],
        ['storage', 0, 1, 0],
        ['nodes', 100, null, null],
        ['webhooks', 1, 5, 20],
        ['projectUsers', 3, 3, 100],
      ]
    );
  });

  it('adds AI usage when present and leaves members out of team usage', () => {
    const rows = buildUsageRows(
      { projectUsers: 2, agentUsage: { agentChatTurns: 5, agentAutomationRuns: 1, agentSteps: 40 } },
      { agentChatTurns: 100 },
      true
    );

    assert.equal(
      rows.some((row) => row.metric === 'projectUsers'),
      false
    );
    assert.deepEqual(
      rows.find((row) => row.metric === 'agentChatTurns'),
      {
        metric: 'agentChatTurns',
        name: 'Chat turns',
        used: 5,
        limit: 100,
        percent: 5,
      }
    );
  });

  it('formats amounts', () => {
    assert.equal(formatAmount(1234567), '1,234,567');
    assert.equal(formatAmount(0.256, 'GB'), '0.26 GB');
  });
});

describe('monthRange', () => {
  const now = new Date('2026-11-03T12:00:00Z');

  it('covers the current month up to now', () => {
    assert.deepEqual(monthRange(undefined, now), {
      startDate: '2026-11-01T00:00:00.000Z',
      endDate: '2026-11-03T12:00:00.000Z',
    });
  });

  it('covers a past month to its last millisecond', () => {
    assert.deepEqual(monthRange('2026-02', now), {
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T23:59:59.999Z',
    });
  });

  it('rejects malformed and future months', () => {
    assert.throws(() => monthRange('2026-13', now), /YYYY-MM/);
    assert.throws(() => monthRange('2027-01', now), /future/);
  });
});
