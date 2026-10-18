import type { ActivityItem, ActivityItemKind, ActivityItemResolution } from './types';

/** More new items than this in one poll are announced by a single summary notification. */
const MAX_SEPARATE_NOTIFICATIONS = 3;

/** Watermark before the first item exists: every later unread item is new. */
const EPOCH = '1970-01-01T00:00:00.000Z';

export interface ActivityNotification {
  body: string;
  /** AI-app relative path opened on click, e.g. `activity/<id>`. */
  path: string;
  /** Same tag = same notification across tabs and repeated polls. */
  tag: string;
  title: string;
}

/** Path, relative to the AI app, of the chat or run an item came from. */
export function getActivitySourcePath(item: ActivityItem): string | null {
  if (item.chatId) {
    return `agent/chats/${item.chatId}`;
  }

  if (item.automationId && item.automationRunId) {
    return `automations/${item.automationId}/runs/${item.automationRunId}`;
  }

  return null;
}

export function getActivitySourceLabel(item: ActivityItem): string | null {
  if (item.chatId) {
    return 'View chat';
  }

  return item.automationId && item.automationRunId ? 'View run' : null;
}

const RESOLUTION_LABELS: { [key in ActivityItemResolution]: string } = {
  answered: 'Answered',
  approved: 'Approved',
  cancelled: 'Cancelled',
  dismissed: 'Dismissed',
  expired: 'Expired',
  rejected: 'Rejected',
};

/** Short status for a row: what happened to it, or that it still waits on the viewer. */
export function getActivityStatusLabel(item: ActivityItem): string | null {
  if (item.kind === 'automation_failure') {
    return 'Failed';
  }

  if (item.kind === 'automation_result') {
    return 'Result';
  }

  if (item.kind === 'monitor_event') {
    return 'Monitor';
  }

  if (item.resolution) {
    return RESOLUTION_LABELS[item.resolution];
  }

  if (!item.requiresAction || item.state === 'done' || item.state === 'dismissed') {
    return null;
  }

  return item.kind === 'question' ? 'Needs answer' : 'Needs approval';
}

/** How a row's status badge reads: waiting on the viewer, a failure, or neutral. */
export function getActivityStatusTone(item: ActivityItem): 'attention' | 'failure' | 'neutral' {
  if (item.kind === 'automation_failure') {
    return 'failure';
  }

  return isActivityItemOpen(item) ? 'attention' : 'neutral';
}

/** True while the item still waits on the viewer. */
export function isActivityItemOpen(item: ActivityItem): boolean {
  return item.requiresAction && item.resolvedAt === null && item.state !== 'dismissed' && item.state !== 'done';
}

/**
 * Turns one summary poll into desktop notifications and the next watermark.
 * The first poll (no watermark yet) only seeds it, so opening Studio never
 * replays notifications for items the user already had.
 */
export function planActivityNotifications({
  mutedKinds = [],
  newItems,
  since,
}: {
  /** Kinds the viewer turned off for desktop notifications; they still move the watermark. */
  mutedKinds?: ActivityItemKind[];
  newItems: ActivityItem[];
  since: string | null;
}): { notifications: ActivityNotification[]; since: string } {
  const newest = newItems.reduce<string | null>(
    (latest, item) => (latest === null || item.createdAt > latest ? item.createdAt : latest),
    null
  );

  if (since === null) {
    return { notifications: [], since: newest ?? EPOCH };
  }

  const fresh = newItems.filter((item) => item.createdAt > since && !mutedKinds.includes(item.kind));
  const nextSince = newest !== null && newest > since ? newest : since;

  if (fresh.length === 0) {
    return { notifications: [], since: nextSince };
  }

  if (fresh.length > MAX_SEPARATE_NOTIFICATIONS) {
    return {
      notifications: [
        {
          body: 'Open Activity in Flexkit Studio to review them.',
          path: 'activity',
          tag: `flexkit-activity-batch:${nextSince}`,
          title: `${fresh.length.toString()} new items in Activity`,
        },
      ],
      since: nextSince,
    };
  }

  return {
    notifications: fresh.map((item) => ({
      body: item.body ?? '',
      path: `activity/${encodeURIComponent(item.id)}`,
      tag: `flexkit-activity:${item.id}`,
      title: item.title,
    })),
    since: nextSince,
  };
}
