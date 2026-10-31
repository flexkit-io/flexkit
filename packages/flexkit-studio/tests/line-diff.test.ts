import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { diffLines } from '../src/apps/ai/line-diff';

describe('diffLines', () => {
  it('keeps shared lines and marks what was removed and added', () => {
    assert.deepEqual(
      diffLines('# KPIs\nWAP: weekly\nMRR: monthly', '# KPIs\nWAP: weekly active projects\nMRR: monthly'),
      [
        { kind: 'same', text: '# KPIs' },
        { kind: 'removed', text: 'WAP: weekly' },
        { kind: 'added', text: 'WAP: weekly active projects' },
        { kind: 'same', text: 'MRR: monthly' },
      ]
    );
  });

  it('handles additions at the end and empty documents', () => {
    assert.deepEqual(diffLines('a', 'a\nb'), [
      { kind: 'same', text: 'a' },
      { kind: 'added', text: 'b' },
    ]);
    assert.deepEqual(diffLines('', 'a'), [
      { kind: 'removed', text: '' },
      { kind: 'added', text: 'a' },
    ]);
  });

  it('gives up on documents too long to compare quickly', () => {
    const long = Array.from({ length: 2000 }, (_, index) => `line ${index.toString()}`).join('\n');

    assert.equal(diffLines(long, `${long}\nmore`), null);
  });
});
