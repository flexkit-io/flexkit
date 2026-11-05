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

/** One entry per chat in rank order; a chat listed twice keeps its first match. */
export function uniquePastChats(results: PastChatResult[] | undefined): PastChatResult[] {
  const seen = new Set<string>();

  return (results ?? []).filter((result) => {
    if (seen.has(result.chatId)) {
      return false;
    }

    seen.add(result.chatId);

    return true;
  });
}

export function summarizeChatSearch(query: string, chats: PastChatResult[]): string {
  if (chats.length === 0) {
    return `No past chats matched "${query}"`;
  }

  return `${String(chats.length)} past ${chats.length === 1 ? 'chat' : 'chats'} for "${query}"`;
}
