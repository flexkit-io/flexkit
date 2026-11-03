import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KNOWLEDGE_MAX_FILE_BYTES,
  formatBytes,
  formatLocator,
  isFinishedJobState,
  knowledgeMediaType,
  linkPath,
  parseContentDispositionFilename,
  parseLinkTarget,
  planKnowledgeInputs,
  sanitizeFilename,
} from '../src/commands/knowledge/files';

describe('knowledgeMediaType', () => {
  it('maps the supported extensions case-insensitively', () => {
    assert.equal(knowledgeMediaType('Handbook.PDF'), 'application/pdf');
    assert.equal(
      knowledgeMediaType('deck.pptx'),
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
    assert.equal(knowledgeMediaType('notes.markdown'), 'text/markdown');
    assert.equal(knowledgeMediaType('page.htm'), 'text/html');
  });

  it('rejects other types and names without an extension', () => {
    assert.equal(knowledgeMediaType('photo.jpg'), null);
    assert.equal(knowledgeMediaType('sheet.xlsx'), null);
    assert.equal(knowledgeMediaType('README'), null);
  });
});

describe('planKnowledgeInputs', () => {
  it('keeps supported files and https URLs and explains the rest', () => {
    const plan = planKnowledgeInputs(
      [
        { path: '/w/a.pdf', label: 'a.pdf', size: 10, explicit: true },
        { path: '/w/a.pdf', label: 'a.pdf', size: 10, explicit: true },
        { path: '/w/docs/logo.png', label: 'docs/logo.png', size: 10, explicit: false },
        { path: '/w/empty.md', label: 'empty.md', size: 0, explicit: true },
        { path: '/w/big.pdf', label: 'big.pdf', size: KNOWLEDGE_MAX_FILE_BYTES + 1, explicit: true },
      ],
      ['https://example.com/policy', 'http://example.com/old', 'https://example.com/policy']
    );

    assert.deepEqual(
      plan.inputs.map((input) => input.label),
      ['a.pdf', 'https://example.com/policy']
    );
    assert.deepEqual(plan.inputs[0], {
      kind: 'file',
      path: '/w/a.pdf',
      label: 'a.pdf',
      size: 10,
      mediaType: 'application/pdf',
      filename: 'a.pdf',
    });
    assert.deepEqual(
      plan.skipped.map((skip) => [skip.label, skip.explicit]),
      [
        ['docs/logo.png', false],
        ['empty.md', true],
        ['big.pdf', true],
        ['http://example.com/old', true],
      ]
    );
  });
});

describe('link targets', () => {
  it('parses entity and entity:recordId', () => {
    assert.deepEqual(parseLinkTarget('product'), { entity: 'product' });
    assert.deepEqual(parseLinkTarget('product:product-chair'), { entity: 'product', recordId: 'product-chair' });
    assert.deepEqual(parseLinkTarget('order:urn:x:1'), { entity: 'order', recordId: 'urn:x:1' });
  });

  it('rejects an empty entity or record id', () => {
    assert.throws(() => parseLinkTarget(':123'), /Expected/);
    assert.throws(() => parseLinkTarget('product:'), /empty/);
  });

  it('encodes link paths', () => {
    assert.equal(linkPath('s1', 'product'), '/knowledge/sources/s1/links/product');
    assert.equal(linkPath('s1', 'product', 'a/b c'), '/knowledge/sources/s1/links/product/a%2Fb%20c');
  });
});

describe('download file names', () => {
  it('prefers filename* and decodes it', () => {
    assert.equal(
      parseContentDispositionFilename(`attachment; filename="Prices.pdf"; filename*=UTF-8''Cen%C3%ADk%202026.pdf`),
      'Ceník 2026.pdf'
    );
  });

  it('reads quoted and plain filenames', () => {
    assert.equal(parseContentDispositionFilename('attachment; filename="a \\"b\\".pdf"'), 'a -b-.pdf');
    assert.equal(parseContentDispositionFilename('attachment; filename=report.docx'), 'report.docx');
    assert.equal(parseContentDispositionFilename('attachment'), null);
    assert.equal(parseContentDispositionFilename(null), null);
  });

  it('never returns a path', () => {
    assert.equal(parseContentDispositionFilename('attachment; filename="../../etc/passwd"'), 'passwd');
    assert.equal(sanitizeFilename('..'), null);
  });
});

describe('formatting', () => {
  it('describes passage locations', () => {
    assert.equal(
      formatLocator({ page: 3, headingPath: ['Pricing', 'Discounts'], charStart: 0, charEnd: 9 }),
      'p. 3 · Pricing › Discounts'
    );
    assert.equal(formatLocator({ slide: 2, charStart: 0, charEnd: 1 }), 'slide 2');
    assert.equal(formatLocator(null), '');
  });

  it('formats sizes', () => {
    assert.equal(formatBytes(512), '512 B');
    assert.equal(formatBytes(2048), '2 KB');
    assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
    assert.equal(formatBytes(null), '');
  });

  it('knows which job states are final', () => {
    assert.equal(isFinishedJobState('completed'), true);
    assert.equal(isFinishedJobState('cancelled'), true);
    assert.equal(isFinishedJobState('embedding'), false);
  });
});
