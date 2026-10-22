import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isKnowledgeLinkKey, knowledgePaths } from '../../src/apps/knowledge/api';
import {
  getAttachableSources,
  getKnowledgeLinkLabel,
  getKnowledgeSourcePath,
  groupKnowledgeLinks,
  type KnowledgeLink,
  type KnowledgeSource,
} from '../../src/apps/knowledge/knowledge';

function link(overrides: Partial<KnowledgeLink> = {}): KnowledgeLink {
  return {
    createdAt: '2026-10-22T10:00:00Z',
    entity: 'product',
    entityPlural: 'products',
    recordId: '73c177b0-89d1-4242-9bc5-6c7dcedeee46',
    title: null,
    ...overrides,
  };
}

function source(overrides: Partial<KnowledgeSource> = {}): KnowledgeSource {
  return {
    agentVisible: true,
    createdAt: '2026-10-21T10:00:00Z',
    createdBy: 'u1',
    currentVersion: null,
    id: 's1',
    kind: 'upload',
    mimeType: 'application/pdf',
    originUrl: null,
    path: 'p/knowledge/uploads/u1/manual.pdf',
    sha256: null,
    size: 1024,
    spaces: [],
    status: 'ready',
    title: 'Manual',
    updatedAt: '2026-10-21T10:00:00Z',
    ...overrides,
  };
}

describe('link paths', () => {
  it('addresses the link routes through the BFF and escapes every segment', () => {
    const paths = knowledgePaths('p1');

    assert.equal(paths.links('s 1'), '/api/flexkit/p1/knowledge/sources/s%201/links');
    assert.equal(
      paths.recordSources({ entity: 'product', recordId: 'a/b' }),
      '/api/flexkit/p1/knowledge/records/product/a%2Fb/sources'
    );
  });

  it('recognises both link listings as keys to drop after a change', () => {
    const paths = knowledgePaths('p1');

    assert.equal(isKnowledgeLinkKey(paths.links('s1')), true);
    assert.equal(isKnowledgeLinkKey(paths.recordSources({ entity: 'product', recordId: 'r1' })), true);
    assert.equal(isKnowledgeLinkKey(paths.source('s1')), false);
    assert.equal(isKnowledgeLinkKey(paths.sources()), false);
    assert.equal(isKnowledgeLinkKey(null), false);
  });

  it('builds the absolute document path', () => {
    assert.equal(getKnowledgeSourcePath('p 1', 's/1'), '/p%201/knowledge/s%2F1');
  });
});

describe('getKnowledgeLinkLabel', () => {
  it('prefers the label the Studio resolved, then the platform title, then a short id', () => {
    assert.equal(getKnowledgeLinkLabel(link({ title: 'Platform title' }), 'Resolved'), 'Resolved');
    assert.equal(getKnowledgeLinkLabel(link({ title: 'Platform title' }), '  '), 'Platform title');
    assert.equal(getKnowledgeLinkLabel(link({ title: 'Platform title' })), 'Platform title');
    assert.equal(getKnowledgeLinkLabel(link()), '73c177b0…');
    assert.equal(getKnowledgeLinkLabel(link({ recordId: 'sku-12' })), 'sku-12');
  });
});

describe('groupKnowledgeLinks', () => {
  it('groups by entity in first-seen order and keeps the link order inside a group', () => {
    const groups = groupKnowledgeLinks([
      link({ recordId: 'p1' }),
      link({ entity: 'supplier', entityPlural: 'suppliers', recordId: 's1' }),
      link({ recordId: 'p2' }),
    ]);

    assert.deepEqual(
      groups.map((group) => [group.entityPlural, group.links.map((entry) => entry.recordId)]),
      [
        ['products', ['p1', 'p2']],
        ['suppliers', ['s1']],
      ]
    );
    assert.equal(groups[0]?.entity, 'product');
    assert.deepEqual(groupKnowledgeLinks([]), []);
  });
});

describe('getAttachableSources', () => {
  it('drops the documents already attached and lists ready ones first', () => {
    const candidates = getAttachableSources(
      [
        source({ id: 'busy', status: 'processing' }),
        source({ id: 'attached' }),
        source({ id: 'ready' }),
        source({ id: 'failed', status: 'failed' }),
      ],
      ['attached']
    );

    assert.deepEqual(
      candidates.map((entry) => entry.id),
      ['ready', 'busy', 'failed']
    );
  });
});
