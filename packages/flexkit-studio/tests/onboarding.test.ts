import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMMERCE_STARTER_PROMPTS,
  describeBusinessPrompt,
  isStarterRunning,
  starterPath,
  toProjectStart,
  validateProjectName,
} from '../src/core/config/onboarding';
import { withDisplayName } from '../src/core/config/use-hosted-session';

describe('onboarding', () => {
  it('checks only what the name field can tell', () => {
    assert.equal(validateProjectName('  '), 'Give your project a name.');
    assert.equal(validateProjectName('x'.repeat(49)), 'Project names can be up to 48 characters.');
    // The backend owns the character rules.
    assert.equal(validateProjectName('Aven Living!'), null);
  });

  it('turns the last step into what the backend and the chat need', () => {
    assert.deepEqual(toProjectStart('starter', false, 'ignored'), {
      kind: 'starter',
      template: 'commerce',
      sampleData: false,
    });
    assert.deepEqual(toProjectStart('describe', true, 'We sell tea'), { kind: 'describe', description: 'We sell tea' });
    assert.deepEqual(toProjectStart('empty', true, ''), { kind: 'empty' });
  });

  it('asks the agent for a schema from the description', () => {
    const prompt = describeBusinessPrompt('  We sell handmade ceramics to shops.  ');

    assert.match(prompt, /^I'm setting up Flexkit for my business: We sell handmade ceramics to shops\.\n/);
    assert.match(prompt, /Design a schema/);
  });

  it('knows when a starter is still being applied', () => {
    const status = { template: 'commerce' as const, sampleData: true };

    assert.equal(isStarterRunning({ ...status, state: 'queued' }), true);
    assert.equal(isStarterRunning({ ...status, state: 'seeding' }), true);
    assert.equal(isStarterRunning({ ...status, state: 'completed' }), false);
    assert.equal(isStarterRunning({ ...status, state: 'failed' }), false);
    assert.equal(isStarterRunning(null), false);
    assert.equal(starterPath('abcdefghij'), '/api/flexkit/abcdefghij/starter');
    assert.ok(COMMERCE_STARTER_PROMPTS.length >= 3);
  });

  it('shows a saved display name without re-reading the session', () => {
    const data = { user: { id: 'u', email: 'a@b.io', displayName: null, avatarUrl: null }, projects: [], teams: [] };
    const next = withDisplayName({ kind: 'ready', data }, 'Ann');

    assert.equal(next?.kind === 'ready' ? next.data.user.displayName : null, 'Ann');
    assert.deepEqual(withDisplayName({ kind: 'anonymous' }, 'Ann'), { kind: 'anonymous' });
  });
});
