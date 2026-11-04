import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { suggestionSetKey, visibleSuggestions, withUsedSuggestion } from '../src/apps/ai/agent/prompt-suggestions';

const prompts = ['Which variants are low on stock?', 'Why are lamps returned?', 'Show revenue by market.'];

describe('prompt suggestions', () => {
  it('stops offering a prompt once it was used, and the rest stay', () => {
    const state = withUsedSuggestion({ hidden: false, used: [] }, prompts[1]!);

    assert.deepEqual(visibleSuggestions(prompts, state), [prompts[0], prompts[2]]);
    assert.equal(withUsedSuggestion(state, prompts[1]!), state);
  });

  it('offers nothing once the set is hidden', () => {
    assert.deepEqual(visibleSuggestions(prompts, { hidden: true, used: [] }), []);
  });

  it('keys the sample-store set by its starter run, so a re-applied starter offers its questions again', () => {
    assert.equal(suggestionSetKey('empty-schema'), 'empty-schema');
    assert.equal(suggestionSetKey('sample-store', '2026-11-04T12:00:00.000Z'), 'sample-store:2026-11-04T12:00:00.000Z');
    assert.notEqual(suggestionSetKey('sample-store', 'a'), suggestionSetKey('sample-store', 'b'));
  });
});
