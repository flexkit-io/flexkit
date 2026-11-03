import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chunk,
  describeState,
  formatKind,
  nextStepCommand,
  partitionIds,
  takeNewItems,
  type ActivityItem,
} from '../src/commands/activity/format';

const ID_A = '0b7e2c4a-91d3-4f5e-8a6b-3c2d1e0f9a87';
const ID_B = '5d1f3e2a-7c4b-4e8d-9f0a-1b2c3d4e5f60';

function item(overrides: Partial<ActivityItem>): ActivityItem {
  return {
    approvalId: null,
    automationId: null,
    automationRunId: null,
    body: null,
    chatId: null,
    chatMessageId: null,
    createdAt: '2026-11-03T10:00:00Z',
    id: ID_A,
    kind: 'automation_result',
    readAt: null,
    requiresAction: false,
    resolution: null,
    resolvedAt: null,
    state: 'unread',
    title: 'Nightly sync finished',
    ...overrides,
  };
}

describe('activity formatting', () => {
  it('labels kinds and states', () => {
    assert.equal(formatKind('approval_request'), 'approval');
    assert.equal(formatKind('something_new'), 'something_new');
    assert.equal(describeState(item({ requiresAction: true, state: 'read' })), 'needs action');
    assert.equal(describeState(item({ requiresAction: true, state: 'done', resolution: 'approved' })), 'approved');
    assert.equal(describeState(item({ state: 'read' })), 'read');
  });

  it('points at the command that continues an item', () => {
    assert.equal(nextStepCommand(item({ kind: 'approval_request', approvalId: 'ap1' })), 'approvals inspect ap1');
    assert.equal(
      nextStepCommand(item({ kind: 'question', chatId: 'c1', requiresAction: true })),
      'chat --chat c1 "<your answer>"'
    );
    assert.equal(nextStepCommand(item({ kind: 'question', chatId: 'c1', requiresAction: false })), 'chat show c1');
    assert.equal(nextStepCommand(item({ kind: 'automation_failure', automationRunId: 'r1' })), 'runs inspect r1');
    assert.equal(nextStepCommand(item({})), null);
  });
});

describe('id helpers', () => {
  it('splits valid and invalid ids and removes duplicates', () => {
    assert.deepEqual(partitionIds([ID_A, 'nope', ID_A, ID_B.toUpperCase()]), {
      valid: [ID_A, ID_B.toUpperCase()],
      invalid: ['nope'],
    });
  });

  it('chunks lists', () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.deepEqual(chunk([], 100), []);
  });
});

describe('takeNewItems', () => {
  it('returns unseen items oldest first and remembers them', () => {
    const seen = new Set([ID_A]);
    const newer = item({ id: ID_B, createdAt: '2026-11-03T10:05:00Z' });
    const newest = item({ id: 'c', createdAt: '2026-11-03T10:06:00Z' });

    assert.deepEqual(takeNewItems([newest, newer, item({})], seen), [newer, newest]);
    assert.deepEqual(takeNewItems([newest, newer], seen), []);
  });
});
