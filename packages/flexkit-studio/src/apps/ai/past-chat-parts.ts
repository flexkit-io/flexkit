/**
 * Pure helpers behind the chat history events in a chat replay: the Search
 * Chats card with the past chats it found and the Read Chat status line.
 * Kept free of React so the labels are unit-tested.
 */
import type { ReplayDataParts } from './replay';

export type PastChatResult = NonNullable<ReplayDataParts['chat-search']['results']>[number];

/** The chat page in the AI app. */
export function getAgentChatPath(projectId: string, chatId: string): string {
  return `/${encodeURIComponent(projectId)}/ai/agent/chats/${encodeURIComponent(chatId)}`;
}

/** The first item for each key, in order. */
export function uniqueBy<Item>(items: Item[] | undefined, getKey: (item: Item) => string): Item[] {
  const seen = new Set<string>();

  return (items ?? []).filter((item) => {
    const key = getKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}

/** One entry per chat in rank order; a chat listed twice keeps its first match. */
export function uniquePastChats(results: PastChatResult[] | undefined): PastChatResult[] {
  return uniqueBy(results, (result) => result.chatId);
}

export function summarizeChatSearch(query: string, chats: PastChatResult[]): string {
  if (chats.length === 0) {
    return `No past chats matched "${query}"`;
  }

  return `${String(chats.length)} past ${chats.length === 1 ? 'chat' : 'chats'} for "${query}"`;
}
