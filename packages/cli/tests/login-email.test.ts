import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatConfirmationCode } from '../src/util/login/email';

describe('formatConfirmationCode', () => {
  it('groups the six digits the way the confirmation page shows them', () => {
    assert.equal(formatConfirmationCode('483921'), '483 921');
    assert.equal(formatConfirmationCode('004120'), '004 120');
  });
});
