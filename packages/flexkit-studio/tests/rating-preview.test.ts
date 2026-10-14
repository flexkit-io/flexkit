import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRatingState } from '../src/data-grid/preview-components/rating-state';

describe('rating preview', () => {
  it('rounds and clamps numeric values to the star count', () => {
    assert.deepEqual(getRatingState(4), { filled: 4, max: 5, label: '4 out of 5 stars' });
    assert.deepEqual(getRatingState(3.6), { filled: 4, max: 5, label: '4 out of 5 stars' });
    assert.deepEqual(getRatingState(9), { filled: 5, max: 5, label: '5 out of 5 stars' });
    assert.deepEqual(getRatingState(-2), { filled: 0, max: 5, label: '0 out of 5 stars' });
    assert.deepEqual(getRatingState('3'), { filled: 3, max: 5, label: '3 out of 5 stars' });
  });

  it('takes the star count from options.max and ignores invalid counts', () => {
    assert.deepEqual(getRatingState(7, 10), { filled: 7, max: 10, label: '7 out of 10 stars' });
    assert.deepEqual(getRatingState(2, 3.9), { filled: 2, max: 3, label: '2 out of 3 stars' });
    assert.equal(getRatingState(2, 0)?.max, 5);
    assert.equal(getRatingState(2, Number.NaN)?.max, 5);
  });

  it('renders nothing for empty or non-numeric values', () => {
    for (const value of [null, undefined, '', '  ', 'n/a', Number.NaN, {}]) {
      assert.equal(getRatingState(value), null, JSON.stringify(value));
    }
  });
});
