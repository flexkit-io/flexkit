/**
 * `approval_request`: a proposal waits on the recipient. `automation_result`: an
 * automation run finished and its notify rule asked for it. `automation_failure`:
 * an automation run failed.
 */
export type ActivityItemKind = 'approval_request' | 'automation_result' | 'automation_failure';

/** `done` = resolved by the system (e.g. the approval was decided); `dismissed` = hidden by the recipient. */
export type ActivityItemState = 'unread' | 'read' | 'done' | 'dismissed';

export type ActivityItemResolution = 'approved' | 'rejected' | 'expired' | 'cancelled';

/** One entry in a user's Studio Activity inbox. */
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
  /** True when the item waits on the recipient (an approval request). */
  requiresAction: boolean;
  resolution: ActivityItemResolution | null;
  resolvedAt: string | null;
  state: ActivityItemState;
  title: string;
}

export interface ActivityItemsPage {
  hasMore: boolean;
  items: ActivityItem[];
}

/** Badge counts plus unread items newer than the client's `since` watermark (newest first, at most 5). */
export interface ActivitySummary {
  needsActionCount: number;
  newItems: ActivityItem[];
  unreadCount: number;
}
