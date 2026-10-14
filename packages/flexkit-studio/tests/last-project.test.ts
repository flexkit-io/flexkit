import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LAST_PROJECT_STORAGE_KEY,
  pickStartProjectId,
  readLastProjectId,
  rememberLastProjectId,
} from '../src/core/config/last-project';

function memoryStorage(initial: { [key: string]: string } = {}) {
  const map = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    map,
  };
}

describe('last project', () => {
  it('round-trips through storage and ignores blank values', () => {
    const storage = memoryStorage();

    assert.equal(readLastProjectId(storage), null);
    rememberLastProjectId('abcdefghij', storage);
    assert.equal(storage.map.get(LAST_PROJECT_STORAGE_KEY), 'abcdefghij');
    assert.equal(readLastProjectId(storage), 'abcdefghij');
    assert.equal(readLastProjectId(memoryStorage({ [LAST_PROJECT_STORAGE_KEY]: '  ' })), null);
  });

  it('survives storage that throws or is missing', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    assert.equal(readLastProjectId(broken), null);
    assert.doesNotThrow(() => {
      rememberLastProjectId('x', broken);
    });
    assert.equal(readLastProjectId(undefined), null);
  });

  it('starts on the remembered project only while it is still accessible', () => {
    assert.equal(pickStartProjectId(['a', 'b'], 'b'), 'b');
    assert.equal(pickStartProjectId(['a', 'b'], 'gone'), 'a');
    assert.equal(pickStartProjectId(['a', 'b'], null), 'a');
    assert.equal(pickStartProjectId([], 'a'), undefined);
  });
});
