import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { StarterStatus } from '../src/core/config/onboarding';
import { watchStarter } from '../src/apps/ai/starter-watch';

const status = (state: StarterStatus['state']): StarterStatus => ({ template: 'commerce', sampleData: true, state });

function run(sequence: (StarterStatus | null | 'missing')[], projectId: string) {
  const published: string[] = [];
  const revalidated: string[] = [];
  let calls = 0;

  return new Promise<{ published: string[]; revalidated: string[]; calls: number }>((resolve) => {
    watchStarter({
      projectId,
      fetchStatus: async () => (calls < sequence.length ? (sequence[calls++] ?? null) : 'missing'),
      publish: async (next) => {
        published.push(next.state);

        if (next.state === 'completed' || next.state === 'failed') {
          setTimeout(() => resolve({ published, revalidated, calls }), 0);
        }
      },
      revalidate: async (id) => {
        revalidated.push(id);
      },
      sleep: async () => {},
    });
  });
}

describe('watchStarter', () => {
  it('reloads the schema once, as soon as the deploy is done, and stops when the starter settles', async () => {
    const result = await run(
      [status('queued'), null, status('deploying'), status('seeding'), status('seeding'), status('completed')],
      'p-watch-1'
    );

    assert.deepEqual(result.published, ['queued', 'deploying', 'seeding', 'seeding', 'completed']);
    assert.deepEqual(result.revalidated, ['p-watch-1']);
  });

  it('does not reload the schema of a starter that failed before its deploy', async () => {
    const result = await run([status('deploying'), status('failed')], 'p-watch-2');

    assert.deepEqual(result.published, ['deploying', 'failed']);
    assert.deepEqual(result.revalidated, []);
  });
});
