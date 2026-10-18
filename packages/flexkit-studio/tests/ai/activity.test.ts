import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ActivityItem } from '../../src/apps/ai/types';
import {
  getActivitySourcePath,
  getActivityStatusLabel,
  getActivityStatusTone,
  isActivityItemOpen,
  planActivityNotifications,
} from '../../src/apps/ai/activity';
import { decodeApplicationServerKey } from '../../src/apps/ai/notification-settings';

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

  it('labels open and answered agent questions', () => {
    const question = { approvalId: null, kind: 'question' as const };

    assert.equal(getActivityStatusLabel(item('q', 'x', question)), 'Needs answer');
    assert.equal(
      getActivityStatusLabel(item('q', 'x', { ...question, resolution: 'answered', resolvedAt: 'y', state: 'done' })),
      'Answered'
    );
  });

  it('labels automation results and failures, which never wait on the viewer', () => {
    const run = { approvalId: null, automationId: 'auto', automationRunId: 'run', chatId: null, requiresAction: false };
    const failure = item('f', 'x', { ...run, kind: 'automation_failure' });
    const result = item('r', 'x', { ...run, kind: 'automation_result' });

    assert.equal(getActivityStatusLabel(failure), 'Failed');
    assert.equal(getActivityStatusTone(failure), 'failure');
    assert.equal(getActivityStatusLabel(result), 'Result');
    assert.equal(getActivityStatusTone(result), 'neutral');
    assert.equal(isActivityItemOpen(result), false);
    assert.equal(getActivitySourcePath(result), 'automations/auto/runs/run');
    assert.equal(getActivityStatusTone(item('a', 'x')), 'attention');
    assert.equal(getActivityStatusLabel(item('m', 'x', { ...run, kind: 'monitor_event' })), 'Monitor');
  });
});

describe('desktop notification preferences', () => {
  it('skips muted kinds but still moves the watermark past them', () => {
    const result = item('r', '2026-10-17T10:00:02Z', { kind: 'automation_result', requiresAction: false });
    const approval = item('a', '2026-10-17T10:00:01Z');
    const plan = planActivityNotifications({
      mutedKinds: ['automation_result'],
      newItems: [result, approval],
      since: '2026-10-17T10:00:00Z',
    });

    assert.deepEqual(
      plan.notifications.map((notification) => notification.tag),
      ['flexkit-activity:a']
    );
    assert.equal(plan.since, '2026-10-17T10:00:02Z');
  });

  it('decodes a base64url VAPID key into bytes', () => {
    assert.deepEqual([...decodeApplicationServerKey('AQID_w')], [1, 2, 3, 255]);
  });
});
