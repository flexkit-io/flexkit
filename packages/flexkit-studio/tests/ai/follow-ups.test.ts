import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AgentChatMessage, AgentChatMessageStatus } from '../../src/apps/ai/types';
import {
  getComposerAction,
  getFollowUpLabel,
  getDeliveredMidTurnMessageIds,
  getNextQueuedMessage,
  splitLiveTurn,
} from '../../src/apps/ai/agent/follow-ups';

function message(id: string, role: 'assistant' | 'user', status: AgentChatMessageStatus): AgentChatMessage {
  return { createdAt: id, error: null, id, parts: [], role, status, textContent: id, workflowRunId: null };
}

describe('splitLiveTurn', () => {
  it('finds the running turn behind the follow-ups sent after it', () => {
    const user = message('u1', 'user', 'complete');
    const live = message('a1', 'assistant', 'streaming');
    const steer = message('u2', 'user', 'steering');
    const queued = message('u3', 'user', 'queued');

    assert.deepEqual(splitLiveTurn([user, live, steer, queued]), { after: [steer, queued], before: [user], live });
    assert.deepEqual(splitLiveTurn([user, live]), { after: [], before: [user], live });
  });

  it('reports no live turn once the last assistant message has settled', () => {
    const user = message('u1', 'user', 'complete');
    const done = message('a1', 'assistant', 'complete');
    const queued = message('u2', 'user', 'queued');

    assert.deepEqual(splitLiveTurn([user, done, queued]), { after: [], before: [user, done, queued], live: null });
    assert.deepEqual(splitLiveTurn([]), { after: [], before: [], live: null });
  });
});

describe('follow-up helpers', () => {
  it('labels waiting follow-ups and finds the next queued one', () => {
    assert.equal(getFollowUpLabel('steering'), 'Picked up at the next step');
    assert.equal(getFollowUpLabel('queued'), 'Sends when this turn ends');
    assert.equal(getFollowUpLabel('complete'), null);

    const first = message('u2', 'user', 'queued');
    const second = message('u3', 'user', 'queued');

    assert.equal(getNextQueuedMessage([message('u1', 'user', 'complete'), first, second]), first);
    assert.equal(getNextQueuedMessage([message('u1', 'user', 'steering')]), null);
  });

  it('finds the follow-ups a reply shows in place', () => {
    const reply = { ...message('a1', 'assistant', 'complete'), parts: [{ type: 'text', text: 'Hi' }, { type: 'data-mid-turn-message', data: { messageId: 'u2', text: 'x', attachments: [] } }] };

    assert.deepEqual([...getDeliveredMidTurnMessageIds([message('u1', 'user', 'complete'), reply])], ['u2']);
    assert.equal(getDeliveredMidTurnMessageIds([message('u1', 'user', 'complete')]).size, 0);
  });

  it('turns the stop button into a send button as soon as there is a draft', () => {
    assert.equal(getComposerAction({ hasDraft: false, streaming: true }), 'stop');
    assert.equal(getComposerAction({ hasDraft: true, streaming: true }), 'send');
    assert.equal(getComposerAction({ hasDraft: false, streaming: false }), 'send');
  });
});
