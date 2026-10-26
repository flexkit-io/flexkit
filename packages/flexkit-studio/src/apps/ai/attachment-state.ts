import type { AgentChatAttachment, AgentChatPart } from './types';

/** Attachments of a persisted user message, read from its `file` parts. */
export function getAttachmentsFromParts(parts: AgentChatPart[] | null | undefined): AgentChatAttachment[] {
  if (!Array.isArray(parts)) {
    return [];
  }

  return parts
    .filter((part) => part.type === 'file' && typeof part.url === 'string')
    .map((part) => ({
      filename: part.filename ?? 'file',
      mediaType: part.mediaType ?? 'application/octet-stream',
      sizeBytes: part.sizeBytes ?? 0,
      url: part.url ?? '',
      ...(part.sha256 ? { sha256: part.sha256 } : {}),
      // null is meaningful: the platform looked and found no document.
      ...(part.knowledgeSourceId !== undefined ? { knowledgeSourceId: part.knowledgeSourceId } : {}),
    }));
}

export type AddToKnowledgeState = { kind: 'idle' } | { kind: 'adding' } | { kind: 'added'; sourceId: string };

/**
 * What the "Add to Knowledge" chip shows: what the user did in this session
 * wins, otherwise what the platform knows about the attachment. A document id
 * the platform sends later (another tab added or removed the document) is
 * picked up on the next render without remounting the chip.
 */
export function resolveAddToKnowledgeState(
  local: AddToKnowledgeState,
  attachment: Pick<AgentChatAttachment, 'knowledgeSourceId'>
): AddToKnowledgeState {
  if (local.kind !== 'idle') {
    return local;
  }

  return attachment.knowledgeSourceId ? { kind: 'added', sourceId: attachment.knowledgeSourceId } : local;
}
