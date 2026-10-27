import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSettled, layoutBudget } from '../../src/apps/graph/layout';

describe('layout', () => {
  it('budgets more time for bigger graphs, capped', () => {
    assert.equal(layoutBudget(1), 2009);
    assert.equal(layoutBudget(500), 6500);
    assert.equal(layoutBudget(5000), 20000);
  });

  it('calls the layout settled once the mean move is a sliver of the extent', () => {
    assert.equal(isSettled(0.2, 1000), true);
    assert.equal(isSettled(2, 1000), false);
    assert.equal(isSettled(0.04, 0), true);
    assert.equal(isSettled(0.06, 0), false);
  });
});
