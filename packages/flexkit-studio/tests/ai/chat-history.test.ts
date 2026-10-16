import assert from 'node:assert/strict';
import { it } from 'node:test';
import { compareChatMessages, mergeChatDetail, sortChatMessages } from '../../src/apps/ai/agent/chat-history';
import type { AgentChatDetail, AgentChatMessage } from '../../src/apps/ai/types';

function message(id: string, createdAt: string, role: 'user' | 'assistant' = 'assistant'): AgentChatMessage {
  return { createdAt, error: null, id, parts: [], role, status: 'complete', textContent: id, workflowRunId: null };
}
function detail(messages: AgentChatMessage[]): AgentChatDetail {
  return {
    chat: { createdAt: 't', id: 'chat', lastMessageAt: null, modelId: null, title: null, updatedAt: 't' },
    messages,
    pendingApproval: null,
  };
}
const m1 = message('m1', '2026-10-16T09:00:01+00:00');
const m2 = message('m2', '2026-10-16T09:00:02+00:00');
const m3 = message('m3', '2026-10-16T09:00:03+00:00');
const u4 = message('u4', '2026-10-16T09:00:04.1+00:00', 'user');
const a5 = message('a5', '2026-10-16T09:00:04.100001+00:00');

it('keeps a locally confirmed turn that a stale GET omitted, after the page it belongs to', () => {
  const merged = mergeChatDetail(detail([m1, m2, m3, u4, a5]), detail([m1, m2, m3]));
  assert.deepEqual(merged?.messages.map((m) => m.id), ['m1', 'm2', 'm3', 'u4', 'a5']);
});

it('drops seeded messages that slid out of the latest page instead of appending them after the live reply', () => {
  const incoming = detail([m3, u4, a5]);
  const merged = mergeChatDetail(detail([m1, m2, m3, u4, a5]), incoming);
  assert.equal(merged, incoming);
});

it('orders by time, then microseconds, then id like the server keyset', () => {
  assert.ok(compareChatMessages(u4, a5) < 0);
  assert.ok(compareChatMessages(m1, m2) < 0);
  assert.ok(compareChatMessages(message('b', m1.createdAt), message('a', m1.createdAt)) > 0);
  assert.deepEqual(sortChatMessages([a5, m2, u4, m2, m1]).map((m) => m.id), ['m1', 'm2', 'u4', 'a5']);
});
