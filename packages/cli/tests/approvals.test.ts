import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { approvalsListPath, decisionBody } from '../src/commands/approvals/index';

describe('approvalsListPath', () => {
  it('lists pending requests by default', () => {
    assert.equal(
      approvalsListPath({ all: false, limit: 25, offset: 0 }),
      '/automations/approvals?limit=25&offset=0&status=pending'
    );
  });

  it('drops the status filter with --all and keeps an explicit status', () => {
    assert.equal(
      approvalsListPath({ all: true, limit: 10, offset: 5, runId: 'r1' }),
      '/automations/approvals?limit=10&offset=5&runId=r1'
    );
    assert.equal(
      approvalsListPath({ all: true, limit: 10, offset: 0, status: 'rejected' }),
      '/automations/approvals?limit=10&offset=0&status=rejected'
    );
  });

  it('rejects unknown statuses', () => {
    assert.throws(() => approvalsListPath({ all: false, limit: 10, offset: 0, status: 'denied' }), /Unknown status/);
  });
});

describe('decisionBody', () => {
  it('sends only the fields that are set', () => {
    assert.deepEqual(decisionBody({ approved: false }), { approved: false });
    assert.deepEqual(decisionBody({ approved: true, force: true, remember: true, reason: '  ok  ' }), {
      approved: true,
      force: true,
      remember: true,
      reason: 'ok',
    });
    assert.deepEqual(decisionBody({ approved: true, reason: '   ' }), { approved: true });
  });
});
