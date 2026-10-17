import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ActivityItem } from '../../src/apps/ai/types';
import {
  getActivitySourcePath,
  getActivityStatusLabel,
  isActivityItemOpen,
  planActivityNotifications,
} from '../../src/apps/ai/activity';

function item(id: string, createdAt: string, overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    approvalId: `approval-${id}`,
    automationId: null,
    automationRunId: null,
    body: `body ${id}`,
    chatId: 'chat-1',
    chatMessageId: 'message-1',
    createdAt,
    id,
    kind: 'approval_request',
    readAt: null,
    requiresAction: true,
    resolution: null,
    resolvedAt: null,
    state: 'unread',
    title: `title ${id}`,
    ...overrides,
  };
}

describe('planActivityNotifications', () => {
  it('only seeds the watermark on the first poll', () => {
    assert.deepEqual(planActivityNotifications({ newItems: [item('a', '2026-10-17T10:00:00Z')], since: null }), {
      notifications: [],
      since: '2026-10-17T10:00:00Z',
    });
    assert.deepEqual(planActivityNotifications({ newItems: [], since: null }), {
      notifications: [],
      since: '1970-01-01T00:00:00.000Z',
    });
  });

  it('announces each new item and moves the watermark to the newest', () => {
    const plan = planActivityNotifications({
      newItems: [item('b', '2026-10-17T10:02:00Z'), item('a', '2026-10-17T10:01:00Z')],
      since: '2026-10-17T10:00:00Z',
    });

    assert.equal(plan.since, '2026-10-17T10:02:00Z');
    assert.deepEqual(plan.notifications[0], {
      body: 'body b',
      path: 'activity/b',
      tag: 'flexkit-activity:b',
      title: 'title b',
    });
    assert.equal(plan.notifications.length, 2);
  });

  it('ignores items at or before the watermark', () => {
    const plan = planActivityNotifications({ newItems: [item('a', '2026-10-17T10:00:00Z')], since: '2026-10-17T10:00:00Z' });

    assert.deepEqual(plan, { notifications: [], since: '2026-10-17T10:00:00Z' });
  });

  it('summarises a burst in one notification', () => {
    const newItems = ['1', '2', '3', '4'].map((id) => item(id, `2026-10-17T10:0${id}:00Z`));
    const plan = planActivityNotifications({ newItems, since: '2026-10-17T10:00:00Z' });

    assert.equal(plan.notifications.length, 1);
    assert.equal(plan.notifications[0]?.title, '4 new items in Activity');
    assert.equal(plan.notifications[0]?.path, 'activity');
  });
});

describe('activity item helpers', () => {
  it('links to the chat or run the item came from', () => {
    assert.equal(getActivitySourcePath(item('a', 'x')), 'agent/chats/chat-1');
    assert.equal(
      getActivitySourcePath(item('a', 'x', { automationId: 'auto', automationRunId: 'run', chatId: null })),
      'automations/auto/runs/run'
    );
    assert.equal(getActivitySourcePath(item('a', 'x', { chatId: null })), null);
  });

  it('labels open and resolved approvals', () => {
    assert.equal(getActivityStatusLabel(item('a', 'x')), 'Needs approval');
    assert.equal(isActivityItemOpen(item('a', 'x', { state: 'read' })), true);

    const decided = item('a', 'x', { resolution: 'rejected', resolvedAt: 'y', state: 'done' });

    assert.equal(getActivityStatusLabel(decided), 'Rejected');
    assert.equal(isActivityItemOpen(decided), false);
  });
});
