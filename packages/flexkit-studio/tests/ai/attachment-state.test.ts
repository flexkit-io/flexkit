import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAttachmentsFromParts, resolveAddToKnowledgeState } from '../../src/apps/ai/attachment-state';

describe('getAttachmentsFromParts', () => {
  it('keeps the hash and the platform verdict, telling null from absent', () => {
    const attachments = getAttachmentsFromParts([
      { type: 'text', text: 'hi' },
      {
        type: 'file',
        url: 'u1',
        filename: 'a.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 3,
        sha256: 'h',
        knowledgeSourceId: 's1',
      },
      {
        type: 'file',
        url: 'u2',
        filename: 'b.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 3,
        sha256: 'k',
        knowledgeSourceId: null,
      },
      { type: 'file', url: 'u3', filename: 'c.pdf', mediaType: 'application/pdf', sizeBytes: 3 },
    ]);

    assert.deepEqual(attachments, [
      {
        filename: 'a.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 3,
        url: 'u1',
        sha256: 'h',
        knowledgeSourceId: 's1',
      },
      {
        filename: 'b.pdf',
        mediaType: 'application/pdf',
        sizeBytes: 3,
        url: 'u2',
        sha256: 'k',
        knowledgeSourceId: null,
      },
      { filename: 'c.pdf', mediaType: 'application/pdf', sizeBytes: 3, url: 'u3' },
    ]);
    assert.deepEqual(getAttachmentsFromParts(null), []);
  });
});

describe('resolveAddToKnowledgeState', () => {
  it('lets the session win and otherwise follows the platform', () => {
    assert.deepEqual(resolveAddToKnowledgeState({ kind: 'idle' }, { knowledgeSourceId: 's1' }), {
      kind: 'added',
      sourceId: 's1',
    });
    assert.deepEqual(resolveAddToKnowledgeState({ kind: 'idle' }, { knowledgeSourceId: null }), { kind: 'idle' });
    assert.deepEqual(resolveAddToKnowledgeState({ kind: 'idle' }, {}), { kind: 'idle' });
    assert.deepEqual(resolveAddToKnowledgeState({ kind: 'adding' }, { knowledgeSourceId: 's1' }), { kind: 'adding' });
    assert.deepEqual(resolveAddToKnowledgeState({ kind: 'added', sourceId: 'mine' }, { knowledgeSourceId: null }), {
      kind: 'added',
      sourceId: 'mine',
    });
  });
});
