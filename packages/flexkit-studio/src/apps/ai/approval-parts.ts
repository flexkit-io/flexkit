import type { AutomationApprovalStatus } from '@flexkit/agent-protocol';
import type { ReplayDataParts, ReplayMessage } from './replay';
import { getPartData } from './status-label';

/** Decisions this client made or observed, by approval id, before the stream caught up. */
export type DecidedApprovals = { [approvalId: string]: AutomationApprovalStatus };

export function messageHasPendingMutationApproval(message: ReplayMessage | undefined): boolean {
  if (!message) {
    return false;
  }

  return message.parts.some((part) => {
    if (part.type !== 'data-mutation-approval') {
      return false;
    }

    return getPartData<ReplayDataParts['mutation-approval']>(part).status === 'pending';
  });
}

/**
 * Once the run record says execution resumed, a `pending` approval part in
 * the in-memory replay is stale. Parts whose decision this client knows are
 * patched to that status so the card stays mounted; unknown ones are dropped
 * until the rebuilt stream delivers their real status.
 */
export function settlePendingMutationApprovals(message: ReplayMessage, decided: DecidedApprovals = {}): ReplayMessage {
  let changed = false;
  const parts: ReplayMessage['parts'] = [];

  for (const part of message.parts) {
    if (part.type !== 'data-mutation-approval') {
      parts.push(part);
      continue;
    }

    const data = getPartData<ReplayDataParts['mutation-approval']>(part);

    if (data.status !== 'pending') {
      parts.push(part);
      continue;
    }

    changed = true;
    const status = decided[data.approvalId];

    if (status && status !== 'pending') {
      parts.push({ ...part, data: { ...data, status } } as typeof part);
    }
  }

  return changed ? { ...message, parts } : message;
}

export function getMutationApprovalIds(
  message: ReplayMessage | undefined,
  options?: { pendingOnly?: boolean }
): string[] {
  if (!message) {
    return [];
  }

  const approvalIds: string[] = [];
  const pendingOnly = options?.pendingOnly ?? false;

  for (const part of message.parts) {
    if (part.type !== 'data-mutation-approval') {
      continue;
    }

    const data = getPartData<ReplayDataParts['mutation-approval']>(part);

    if (pendingOnly && data.status !== 'pending') {
      continue;
    }

    approvalIds.push(data.approvalId);
  }

  return approvalIds;
}

export function getPendingMutationApprovalIds(message: ReplayMessage | undefined): string[] {
  return getMutationApprovalIds(message, { pendingOnly: true });
}
