import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatCitationLocator,
  getKnowledgeSourcePath,
  groupCitationsBySource,
  summarizeKnowledgeSearch,
  type KnowledgeCitation,
} from '../../src/apps/ai/knowledge-parts';

function citation(overrides: Partial<KnowledgeCitation> = {}): KnowledgeCitation {
  return {
    excerpt: 'Returns are accepted within 30 days.',
    locator: { page: 3, headingPath: ['Returns', 'Window'] },
    passageId: 'v1:17',
    sourceId: 'src1',
    sourceTitle: 'Return policy',
    versionId: 'v1',
    ...overrides,
  };
}

describe('formatCitationLocator', () => {
  it('reads like a citation', () => {
    assert.equal(formatCitationLocator({ page: 3, headingPath: ['Returns', 'Window'] }), 'p. 3 · Returns › Window');
    assert.equal(formatCitationLocator({ slide: 2 }), 'slide 2');
    assert.equal(formatCitationLocator({}), '');
  });
});

describe('groupCitationsBySource', () => {
  it('groups passages under their document in first-hit order and drops repeats', () => {
    const grouped = groupCitationsBySource([
      citation(),
      citation({
        passageId: 'v2:0',
        sourceId: 'src2',
        sourceTitle: 'Deck',
        locator: { slide: 4 },
        excerpt: 'Slide text',
      }),
      citation({ passageId: 'v1:18', locator: {}, excerpt: 'Items must be unused.' }),
      citation(),
    ]);

    assert.deepEqual(grouped, [
      {
        passages: [
          { excerpt: 'Returns are accepted within 30 days.', locator: 'p. 3 · Returns › Window', passageId: 'v1:17' },
          { excerpt: 'Items must be unused.', locator: '', passageId: 'v1:18' },
        ],
        sourceId: 'src1',
        sourceTitle: 'Return policy',
      },
      {
        passages: [{ excerpt: 'Slide text', locator: 'slide 4', passageId: 'v2:0' }],
        sourceId: 'src2',
        sourceTitle: 'Deck',
      },
    ]);
    assert.deepEqual(groupCitationsBySource(undefined), []);
  });
});

describe('summarizeKnowledgeSearch and paths', () => {
  it('counts passages and documents, and says when nothing matched', () => {
    assert.equal(
      summarizeKnowledgeSearch({
        query: 'returns',
        results: [citation(), citation({ passageId: 'v1:18' })],
        status: 'done',
      }),
      '2 passages from 1 document for "returns"'
    );
    assert.equal(summarizeKnowledgeSearch({ query: 'x', results: [], status: 'done' }), 'No passages matched "x"');
    assert.equal(summarizeKnowledgeSearch({ query: 'x', status: 'done' }), 'No passages matched "x"');
  });

  it('links to the document page of the Knowledge app', () => {
    assert.equal(getKnowledgeSourcePath('abcdefghij', 'v1 src'), '/abcdefghij/knowledge/v1%20src');
  });
});
