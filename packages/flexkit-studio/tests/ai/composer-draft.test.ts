import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMPOSER_DRAFT_STORAGE_PREFIX,
  getComposerDraftKey,
  readComposerDraft,
  writeComposerDraft,
} from '../../src/apps/ai/agent/composer-draft';

function memoryStorage() {
  const map = new Map<string, string>();

  return {
    getItem: (key: string) => map.get(key) ?? null,
    map,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('composer drafts', () => {
  it('keys drafts by project and chat, with a fixed id for the New chat page', () => {
    assert.equal(getComposerDraftKey('p1', 'chat-1'), `${COMPOSER_DRAFT_STORAGE_PREFIX}p1:chat-1`);
    assert.equal(getComposerDraftKey('p1', undefined), `${COMPOSER_DRAFT_STORAGE_PREFIX}p1:new`);
    assert.notEqual(getComposerDraftKey('p1', undefined), getComposerDraftKey('p2', undefined));
  });

  it('round-trips a draft and forgets it once the composer is blank', () => {
    const storage = memoryStorage();
    const key = getComposerDraftKey('p1', 'chat-1');

    assert.equal(readComposerDraft(key, storage), '');
    writeComposerDraft(key, 'Summarize the open orders', storage);
    assert.equal(readComposerDraft(key, storage), 'Summarize the open orders');
    writeComposerDraft(key, '   ', storage);
    assert.equal(storage.map.has(key), false);
    assert.equal(readComposerDraft(key, storage), '');
  });

  it('tolerates a missing or failing storage', () => {
    const failing = {
      getItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    assert.equal(readComposerDraft('k', null), '');
    assert.doesNotThrow(() => writeComposerDraft('k', 'text', null));
    assert.equal(readComposerDraft('k', failing), '');
    assert.doesNotThrow(() => writeComposerDraft('k', 'text', failing));
  });
});
