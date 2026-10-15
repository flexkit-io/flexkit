import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReplayMessage } from '../../src/apps/ai/replay';
import {
  getPendingMutationApprovalIds,
  messageHasPendingMutationApproval,
  settlePendingMutationApprovals,
} from '../../src/apps/ai/approval-parts';

const approvalPart = (approvalId: string, status: string) =>
  ({ type: 'data-mutation-approval', id: approvalId, data: { approvalId, operationsSummary: 's', status } }) as ReplayMessage['parts'][number];
const message = (parts: ReplayMessage['parts']): ReplayMessage => ({ id: 'm', role: 'assistant', parts }) as ReplayMessage;

describe('settlePendingMutationApprovals', () => {
  it('patches pending parts whose decision is known and drops the rest', () => {
    const input = message([
      { type: 'text', text: 'hi' } as ReplayMessage['parts'][number],
      approvalPart('a', 'pending'),
      approvalPart('b', 'pending'),
      approvalPart('c', 'executed'),
    ]);
    const result = settlePendingMutationApprovals(input, { a: 'approved' });

    assert.deepEqual(
      result.parts.map((part) => ('data' in part ? `${(part.data as { approvalId: string }).approvalId}:${(part.data as { status: string }).status}` : part.type)),
      ['text', 'a:approved', 'c:executed']
    );
    assert.equal(messageHasPendingMutationApproval(result), false);
    assert.deepEqual(getPendingMutationApprovalIds(input), ['a', 'b']);
  });

  it('returns the same message when nothing is pending', () => {
    const input = message([approvalPart('c', 'executed')]);

    assert.equal(settlePendingMutationApprovals(input, { c: 'approved' }), input);
  });
});
