import type { AgentChatMessage, AgentChatMessageStatus } from '../types';

/**
 * Pure helpers for messages sent while a turn runs. The composer stays open
 * during a turn; what the user sends then is stored at once and either
 * steers the running turn or waits as the next one.
 */

export function isActiveTurnStatus(status: AgentChatMessageStatus): boolean {
  return status === 'pending' || status === 'streaming' || status === 'awaiting_approval';
}

export function isFollowUpStatus(status: AgentChatMessageStatus): status is 'queued' | 'steering' {
  return status === 'queued' || status === 'steering';
}

export interface LiveTurnSplit {
  /** Messages sent after the live turn started: follow-ups waiting on it. */
  after: AgentChatMessage[];
  before: AgentChatMessage[];
  /** The assistant message still being produced, if any. */
  live: AgentChatMessage | null;
}

/**
 * Finds the running assistant turn. It is no longer necessarily the last
 * message: follow-ups the user sent meanwhile come after it.
 */
export function splitLiveTurn(messages: AgentChatMessage[]): LiveTurnSplit {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]!;

    if (message.role !== 'assistant') {
      continue;
    }

    if (!isActiveTurnStatus(message.status)) {
      break;
    }

    return { after: messages.slice(index + 1), before: messages.slice(0, index), live: message };
  }

  return { after: [], before: messages, live: null };
}

/** The line shown under a follow-up bubble while it waits; null once it was sent normally. */
export function getFollowUpLabel(status: AgentChatMessageStatus): string | null {
  if (status === 'steering') {
    return 'Picked up at the next step';
  }

  if (status === 'queued') {
    return 'Sends when this turn ends';
  }

  return null;
}

/**
 * Messages the user sent mid-turn that the agent has received: the reply
 * shows them where they landed, so their own rows are not shown again.
 */
export function getDeliveredMidTurnMessageIds(messages: AgentChatMessage[]): Set<string> {
  const ids = new Set<string>();

  for (const message of messages) {
    if (message.role !== 'assistant' || !Array.isArray(message.parts)) {
      continue;
    }

    for (const part of message.parts) {
      const messageId = part.type === 'data-mid-turn-message' ? (part.data as { messageId?: unknown } | undefined)?.messageId : null;

      if (typeof messageId === 'string') {
        ids.add(messageId);
      }
    }
  }

  return ids;
}

/**
 * The oldest queued follow-up: the one that starts the next turn. Monitor
 * events are left to the server, which checks the monitor's credit cap first.
 */
export function getNextQueuedMessage(messages: AgentChatMessage[]): AgentChatMessage | null {
  return (
    messages.find((message) => message.role === 'user' && message.status === 'queued' && message.kind !== 'monitor_event') ??
    null
  );
}

/**
 * What the composer's main button does: the turn is stopped while nothing is
 * typed; as soon as there is a draft, the same button sends it, during a turn
 * as a follow-up.
 */
export function getComposerAction(input: { hasDraft: boolean; streaming: boolean }): 'send' | 'stop' {
  return input.streaming && !input.hasDraft ? 'stop' : 'send';
}
