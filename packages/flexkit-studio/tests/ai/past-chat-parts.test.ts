import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getAgentChatPath,
  summarizeChatSearch,
  uniquePastChats,
  type PastChatResult,
} from '../../src/apps/ai/past-chat-parts';

function chat(overrides: Partial<PastChatResult> = {}): PastChatResult {
  return { chatId: 'c1', chatTitle: 'Churn report', date: '2026-10-28', excerpt: 'Churn was 4%', messageId: 'm1', ...overrides };
}

describe('past chat parts', () => {
  it('links to the chat page of the AI app', () => {
    assert.equal(getAgentChatPath('my project', 'c/1'), '/my%20project/ai/agent/chats/c%2F1');
  });

  it('keeps one entry per chat in rank order', () => {
    const chats = uniquePastChats([chat(), chat({ chatId: 'c2' }), chat({ messageId: 'm9' })]);

    assert.deepEqual(
      chats.map((entry) => `${entry.chatId}:${entry.messageId}`),
      ['c1:m1', 'c2:m1']
    );
    assert.deepEqual(uniquePastChats(undefined), []);
  });

  it('summarizes the search', () => {
    assert.equal(summarizeChatSearch('churn', []), 'No past chats matched "churn"');
    assert.equal(summarizeChatSearch('churn', [chat()]), '1 past chat for "churn"');
    assert.equal(summarizeChatSearch('churn', [chat(), chat({ chatId: 'c2' })]), '2 past chats for "churn"');
  });
});
