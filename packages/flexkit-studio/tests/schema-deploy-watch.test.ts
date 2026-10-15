import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { settleSchemaDeployment, watchSchemaDeployment } from '../src/apps/ai/schema-deploy-watch';
import type { AutomationApproval } from '../src/apps/ai/types';

const approval = (overrides: Partial<AutomationApproval>): AutomationApproval =>
  ({ id: 'a', kind: 'schema', status: 'approved', error: null, executedAt: null, projectId: 'p', ...overrides }) as AutomationApproval;

function recorder(): { calls: string[]; revalidate: (projectId: string) => Promise<void> } {
  const calls: string[] = [];

  return {
    calls,
    revalidate: async (projectId: string) => {
      calls.push(projectId);
    },
  };
}

describe('settleSchemaDeployment', () => {
  it('keeps polling an approved schema change until it executes, then refreshes the schema', () => {
    const { calls, revalidate } = recorder();

    assert.equal(settleSchemaDeployment(approval({}), 'p', revalidate), true);
    assert.deepEqual(calls, []);
    assert.equal(settleSchemaDeployment(approval({ executedAt: '2026-10-15T00:00:00Z' }), 'p', revalidate), false);
    assert.deepEqual(calls, ['p']);
  });

  it('stops without refreshing on failure, rejection or other kinds', () => {
    const { calls, revalidate } = recorder();

    assert.equal(settleSchemaDeployment(approval({ executedAt: 'x', error: 'boom' }), 'p', revalidate), false);
    assert.equal(settleSchemaDeployment(approval({ status: 'rejected' }), 'p', revalidate), false);
    assert.equal(settleSchemaDeployment(approval({ kind: 'graphql', executedAt: 'x' }), 'p', revalidate), false);
    assert.equal(settleSchemaDeployment(null, 'p', revalidate), false);
    assert.deepEqual(calls, []);
  });
});

describe('watchSchemaDeployment', () => {
  it('polls until executed, refreshes once, and ignores a duplicate watch', async () => {
    const { calls, revalidate } = recorder();
    const states = [approval({}), null, approval({}), approval({ executedAt: 'done' })];
    let fetches = 0;
    const settled = new Promise<void>((resolve) => {
      const fetchApproval = async (): Promise<AutomationApproval | null> => {
        fetches += 1;
        const next = states.length > 0 ? (states.shift() as AutomationApproval | null) : approval({ executedAt: 'done' });

        if (next?.executedAt) setTimeout(resolve, 0);

        return next;
      };
      const options = { approvalId: 'w1', fetchApproval, projectId: 'p', revalidate, sleep: async () => undefined };

      watchSchemaDeployment(options);
      watchSchemaDeployment(options);
    });

    await settled;
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(fetches, 4);
    assert.deepEqual(calls, ['p']);
  });

  it('does nothing without a way to load the approval', () => {
    const { calls, revalidate } = recorder();

    watchSchemaDeployment({ approvalId: 'w2', projectId: 'p', revalidate });
    assert.deepEqual(calls, []);
  });
});
