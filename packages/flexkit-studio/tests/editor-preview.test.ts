import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateText } from '@tiptap/core';
import type { Extensions } from '@tiptap/core';
import { defaultExtensions } from '../src/form/fields/editor/extensions';
import { getEditorPreviewText } from '../src/data-grid/preview-components/editor-text';

test('cached editor serialization preserves existing rich-text preview output', () => {
  const documents = [
    { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] },
    {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Heading' }] },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First' }, { type: 'hardBreak' }, { type: 'text', text: 'Second' }],
        },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item' }] }] }],
        },
      ],
    },
    { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Long text '.repeat(30) }] }] },
    { type: 'doc', content: [{ type: 'paragraph' }] },
  ];

  for (const document of documents) {
    const expected = generateText(document, defaultExtensions as Extensions).substring(0, 100);
    assert.equal(getEditorPreviewText(JSON.stringify(document)), expected);
    assert.equal(getEditorPreviewText(JSON.stringify(document)), expected);
  }
});

test('legacy text and malformed editor content keep the existing fallback', () => {
  for (const value of ['Plain text', '{broken', JSON.stringify({ type: 'unknownNode' })]) {
    assert.equal(getEditorPreviewText(value), value.substring(0, 100));
  }
  assert.equal(getEditorPreviewText(undefined), '');
  assert.equal(getEditorPreviewText(''), '');
});

if (process.env.FLEXKIT_BENCHMARK === '1') {
  test('benchmark 36 rows with two rich-text columns', (context) => {
    const value = JSON.stringify({
      type: 'doc',
      content: Array.from({ length: 10 }, () => ({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Product description with formatted content. '.repeat(5) }],
      })),
    });
    const baseline = () => generateText(JSON.parse(value), defaultExtensions as Extensions).substring(0, 100);
    const optimized = () => getEditorPreviewText(value);
    assert.equal(optimized(), baseline());
    const measure = (render: () => string) => {
      const samples = Array.from({ length: 9 }, () => {
        const start = performance.now();
        for (let cell = 0; cell < 72; cell++) render();
        return performance.now() - start;
      });
      return samples.sort((a, b) => a - b)[4];
    };
    context.diagnostic(JSON.stringify({ baselineMs: measure(baseline), optimizedMs: measure(optimized) }));
  });
}
