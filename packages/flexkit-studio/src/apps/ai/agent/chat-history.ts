import type { AgentChatDetail, AgentChatMessage } from '../types';

/** Chronological order with the backend's (created_at, id) keyset as tiebreak. */
export function compareChatMessages(a: AgentChatMessage, b: AgentChatMessage): number {
  const byTime = Date.parse(a.createdAt) - Date.parse(b.createdAt);

  if (Number.isFinite(byTime) && byTime !== 0) {
    return byTime;
  }

  // Same millisecond: the server timestamps carry microseconds, so fall back to
  // the string, then to the id, exactly like the keyset cursor.
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? -1 : 1;
  }

  if (a.id === b.id) {
    return 0;
  }

  return a.id < b.id ? -1 : 1;
}

/** Deduplicates by id (later entries win) and sorts chronologically. */
export function sortChatMessages(messages: AgentChatMessage[]): AgentChatMessage[] {
  const byId = new Map(messages.map((message) => [message.id, message]));

  return [...byId.values()].sort(compareChatMessages);
}

/**
 * Keep locally confirmed turns when a stale in-flight GET wins the SWR write.
 *
 * `incoming.messages` is only the latest page of history, so the sole reason a
 * seeded message can be missing from it is that the GET predates the turn:
 * such messages are newer than everything in the page. Anything older merely
 * slid out of the page and belongs to "Load earlier messages", so appending it
 * would place old history after the live reply.
 */
export function mergeChatDetail(
  current: AgentChatDetail | undefined,
  incoming: AgentChatDetail | undefined
): AgentChatDetail | undefined {
  if (!incoming) {
    return current;
  }

  if (!current) {
    return incoming;
  }

  const incomingIds = new Set(incoming.messages.map((message) => message.id));
  const newest = incoming.messages[incoming.messages.length - 1];
  const retained = current.messages.filter(
    (message) => !incomingIds.has(message.id) && (!newest || compareChatMessages(message, newest) > 0)
  );

  if (retained.length === 0) {
    return incoming;
  }

  return {
    ...incoming,
    messages: sortChatMessages([...incoming.messages, ...retained]),
  };
}
