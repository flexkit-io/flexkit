/** Pure helpers for `flexkit activity`. */

export type ActivityItemKind =
  | 'approval_request'
  | 'automation_result'
  | 'automation_failure'
  | 'monitor_event'
  | 'question';
export type ActivityItemState = 'unread' | 'read' | 'done' | 'dismissed';

/** One item of the caller's Activity inbox, as `GET /activity` returns it. */
export interface ActivityItem {
  approvalId: string | null;
  automationId: string | null;
  automationRunId: string | null;
  body: string | null;
  chatId: string | null;
  chatMessageId: string | null;
  createdAt: string;
  id: string;
  kind: ActivityItemKind;
  readAt: string | null;
  requiresAction: boolean;
  resolution: string | null;
  resolvedAt: string | null;
  state: ActivityItemState;
  title: string;
}

const KIND_LABELS: Record<ActivityItemKind, string> = {
  approval_request: 'approval',
  automation_failure: 'run failed',
  automation_result: 'run result',
  monitor_event: 'monitor',
  question: 'question',
};

export function formatKind(kind: string): string {
  return KIND_LABELS[kind as ActivityItemKind] ?? kind;
}

/**
 * The state column: `needs action` for open items that wait on the reader,
 * the resolution for settled ones (`approved`, `answered`, …), else the state.
 */
export function describeState(item: Pick<ActivityItem, 'requiresAction' | 'resolution' | 'state'>): string {
  if (item.requiresAction && (item.state === 'unread' || item.state === 'read')) {
    return 'needs action';
  }

  if (item.resolution) {
    return item.resolution;
  }

  return item.state;
}

/** The command that continues the work an item points at, or null. */
export function nextStepCommand(item: ActivityItem): string | null {
  if (item.kind === 'approval_request' && item.approvalId) {
    return `approvals inspect ${item.approvalId}`;
  }

  if ((item.kind === 'question' || item.kind === 'monitor_event') && item.chatId) {
    return item.kind === 'question' && item.requiresAction
      ? `chat --chat ${item.chatId} "<your answer>"`
      : `chat show ${item.chatId}`;
  }

  if (item.automationRunId) {
    return `runs inspect ${item.automationRunId}`;
  }

  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Splits ids into valid item ids and the rest, which the API would reject. */
export function partitionIds(ids: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const id of ids) {
    (UUID.test(id) ? valid : invalid).push(id);
  }

  return { valid: [...new Set(valid)], invalid };
}

/** Splits a list into batches of `size` (the read endpoint takes at most 100 ids). */
export function chunk<T>(values: T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    batches.push(values.slice(index, index + size));
  }

  return batches;
}

/**
 * Items of a fresh poll the follower has not printed yet, oldest first.
 * `seen` is updated in place.
 */
export function takeNewItems(items: ActivityItem[], seen: Set<string>): ActivityItem[] {
  const fresh = items.filter((item) => !seen.has(item.id));

  for (const item of fresh) {
    seen.add(item.id);
  }

  return fresh.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}
