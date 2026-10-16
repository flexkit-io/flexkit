/**
 * Unsent composer text, kept per chat so leaving a chat (or reloading the
 * Studio) and coming back restores what was typed.
 */

export const COMPOSER_DRAFT_STORAGE_PREFIX = 'flexkit:agent:draft:';

/** The draft id of the New chat page, which has no chat id yet. */
export const NEW_CHAT_DRAFT_ID = 'new';

export type DraftStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

function defaultStorage(): DraftStorage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function getComposerDraftKey(projectId: string, chatId: string | undefined): string {
  return `${COMPOSER_DRAFT_STORAGE_PREFIX}${projectId}:${chatId ?? NEW_CHAT_DRAFT_ID}`;
}

export function readComposerDraft(key: string, storage: DraftStorage | null = defaultStorage()): string {
  try {
    return storage?.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Stores the draft, or forgets it once the composer is blank again (e.g. after a send). */
export function writeComposerDraft(key: string, value: string, storage: DraftStorage | null = defaultStorage()): void {
  try {
    if (value.trim().length === 0) {
      storage?.removeItem(key);
    } else {
      storage?.setItem(key, value);
    }
  } catch {
    // Storage can be full or blocked (private mode); the draft then only lives in memory.
  }
}
