/** Chat shapes returned by the agent chat API. */
export type AgentChatMessageRole = 'user' | 'assistant';
/** `pending` exists only client-side, for a turn whose record has not been created yet. */
export type AgentChatMessageStatus = 'pending' | 'streaming' | 'awaiting_approval' | 'complete' | 'failed';

export interface AgentChat {
  createdAt: string;
  id: string;
  lastMessageAt: string | null;
  modelId: string | null;
  title: string | null;
  updatedAt: string;
}

/** A file the user uploaded for a chat message. */
export interface AgentChatAttachment {
  filename: string;
  mediaType: string;
  sizeBytes: number;
  url: string;
}

/** UIMessage-shaped part persisted for finished turns. */
export interface AgentChatPart {
  data?: unknown;
  errorText?: string;
  /** `file` parts: original filename of a user attachment. */
  filename?: string;
  input?: unknown;
  /** `file` parts: IANA media type of a user attachment. */
  mediaType?: string;
  output?: unknown;
  /** `file` parts: byte size of a user attachment. */
  sizeBytes?: number;
  state?: string;
  text?: string;
  toolCallId?: string;
  type: string;
  /** `file` parts: public URL of a user attachment. */
  url?: string;
}

export interface AgentChatMessage {
  createdAt: string;
  error: string | null;
  id: string;
  parts: AgentChatPart[] | null;
  role: AgentChatMessageRole;
  status: AgentChatMessageStatus;
  textContent: string;
  workflowRunId: string | null;
}

export interface AgentChatTurn {
  assistantMessage: AgentChatMessage;
  userMessage: AgentChatMessage;
  workflowRunId: string;
}
