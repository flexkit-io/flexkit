import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isChunkLoadError } from '../src/core/error/chunk-load-error';

function namedError(name: string, message: string): Error {
  const error = new Error(message);

  error.name = name;

  return error;
}

describe('isChunkLoadError', () => {
  it('recognises the errors of bundlers and browsers', () => {
    for (const message of [
      'Failed to load chunk /_next/static/chunks/2n3fb48wxpvnw.js from module 64072',
      'Loading chunk 123 failed.\n(error: https://example.com/_next/static/chunks/123.js)',
      'Loading CSS chunk app-desk failed.',
      'Failed to fetch dynamically imported module: https://example.com/assets/root-abc.js',
      'error loading dynamically imported module: https://example.com/assets/root-abc.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/root-abc.css',
    ]) {
      assert.equal(isChunkLoadError(new Error(message)), true, message);
    }

    assert.equal(isChunkLoadError(namedError('ChunkLoadError', 'anything')), true);
  });

  it('ignores other errors and non-errors', () => {
    assert.equal(isChunkLoadError(new Error('Failed to load entities')), false);
    assert.equal(isChunkLoadError(new Error('Failed to load chunked upload')), false);
    assert.equal(isChunkLoadError(new TypeError('Failed to fetch')), false);
    assert.equal(isChunkLoadError('Failed to load chunk x'), false);
    assert.equal(isChunkLoadError(null), false);
    assert.equal(isChunkLoadError(undefined), false);
  });
});
