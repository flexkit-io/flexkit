import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BookText, PackageMinus, Zap } from 'lucide-react';
import { templateColor, templateIcon } from '../../src/apps/ai/template-avatar';

describe('templateColor', () => {
  it('uses the color the template names', () => {
    assert.equal(templateColor({ color: 'amber', name: 'low-stock-alert' }), 'amber');
  });

  it('picks the same palette color from the name when there is none or an unknown one', () => {
    const picked = templateColor({ color: null, name: 'low-stock-alert' });

    assert.equal(templateColor({ name: 'low-stock-alert' }), picked);
    assert.equal(templateColor({ color: 'chartreuse', name: 'low-stock-alert' }), picked);
    assert.ok(['violet', 'blue', 'sky', 'teal', 'emerald', 'amber', 'orange', 'rose'].includes(picked));
  });

  it('does not take inherited object keys for colors', () => {
    assert.notEqual(templateColor({ color: 'toString', name: 'x' }), 'toString');
  });
});

describe('templateIcon', () => {
  it('uses the icon the template names', () => {
    assert.equal(templateIcon({ icon: 'package-minus', kind: 'automation' }), PackageMinus);
  });

  it('falls back on the kind for a missing or unknown icon', () => {
    assert.equal(templateIcon({ kind: 'automation' }), Zap);
    assert.equal(templateIcon({ icon: 'rocket', kind: 'skill' }), BookText);
    assert.equal(templateIcon({ icon: 'constructor', kind: 'automation' }), Zap);
  });
});
