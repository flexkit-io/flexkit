import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getDisabledReasonLabel,
  isMemberPersonalOnly,
  needsPersonalConversionConfirm,
} from '../../src/apps/ai/automation-access';
import { getResponseErrorMessage } from '../../src/apps/ai/response-error';

describe('isMemberPersonalOnly', () => {
  it('limits editors and contributors when the backend reports the capability', () => {
    for (const canCreatePersonalAutomations of [true, false]) {
      assert.equal(isMemberPersonalOnly({ role: 'editor', capabilities: { canCreatePersonalAutomations } }), true);
      assert.equal(isMemberPersonalOnly({ role: 'contributor', capabilities: { canCreatePersonalAutomations } }), true);
    }
  });

  it('never limits owners and developers', () => {
    assert.equal(isMemberPersonalOnly({ role: 'owner', capabilities: { canCreatePersonalAutomations: true } }), false);
    assert.equal(isMemberPersonalOnly({ role: 'developer', capabilities: { canCreatePersonalAutomations: true } }), false);
  });

  it('keeps the form as before with an older backend', () => {
    assert.equal(isMemberPersonalOnly({ role: 'editor' }), false);
    assert.equal(isMemberPersonalOnly({ role: 'editor', capabilities: { canDeleteRecords: true } }), false);
    assert.equal(isMemberPersonalOnly({ role: 'contributor', capabilities: { canCreatePersonalAutomations: 'yes' } }), false);
    assert.equal(isMemberPersonalOnly({ role: 'contributor', capabilities: null }), false);
    assert.equal(isMemberPersonalOnly(undefined), false);
  });
});

describe('needsPersonalConversionConfirm', () => {
  it('asks an owner or developer who makes a shared automation personal', () => {
    for (const visibility of ['project', 'space', undefined] as const) {
      assert.equal(
        needsPersonalConversionConfirm({ memberPersonalOnly: false, nextVisibility: 'personal', saved: { visibility } }),
        true,
        String(visibility)
      );
    }
  });

  it('does not ask otherwise', () => {
    assert.equal(
      needsPersonalConversionConfirm({ memberPersonalOnly: false, nextVisibility: 'personal', saved: undefined }),
      false
    );
    assert.equal(
      needsPersonalConversionConfirm({ memberPersonalOnly: false, nextVisibility: 'personal', saved: { visibility: 'personal' } }),
      false
    );
    assert.equal(
      needsPersonalConversionConfirm({ memberPersonalOnly: false, nextVisibility: 'space', saved: { visibility: 'project' } }),
      false
    );
    assert.equal(
      needsPersonalConversionConfirm({ memberPersonalOnly: true, nextVisibility: 'personal', saved: { visibility: 'project' } }),
      false
    );
  });
});

describe('getDisabledReasonLabel', () => {
  const off = { disabledByName: null, enabled: false };

  it('says why the platform switched an automation off', () => {
    assert.equal(getDisabledReasonLabel({ ...off, disabledByName: 'Ada', disabledReason: 'owner' }), 'Switched off by Ada');
    assert.equal(getDisabledReasonLabel({ ...off, disabledReason: 'owner' }), 'Switched off by a project owner');
    assert.equal(getDisabledReasonLabel({ ...off, disabledReason: 'creator_role' }), 'Your role no longer allows it');
    assert.equal(getDisabledReasonLabel({ ...off, disabledReason: 'credit_cap' }), 'Credit limit reached');
    assert.equal(getDisabledReasonLabel({ ...off, disabledReason: 'loop_protection' }), 'Switched off by loop protection');
  });

  it('says nothing for an automation that is on, switched off by hand, or from an older backend', () => {
    assert.equal(getDisabledReasonLabel({ disabledReason: 'credit_cap', enabled: true }), null);
    assert.equal(getDisabledReasonLabel({ ...off, disabledReason: null }), null);
    assert.equal(getDisabledReasonLabel({ enabled: false }), null);
  });
});

describe('getResponseErrorMessage', () => {
  it('prefers the automation refusal message', () => {
    assert.equal(
      getResponseErrorMessage({ success: false, errorCode: 'member_webhook', errorMessage: 'No webhooks.', error: 'Forbidden' }),
      'No webhooks.'
    );
    assert.equal(getResponseErrorMessage({ errorMessage: ['First.', 'Second.'] }), 'First., Second.');
  });

  it('falls back to error, then to the default text', () => {
    assert.equal(getResponseErrorMessage({ error: 'Not found' }), 'Not found');
    assert.equal(getResponseErrorMessage({ errorMessage: '', error: 'Not found' }), 'Not found');
    assert.equal(getResponseErrorMessage({ errorMessage: [] }), 'Request failed');
    assert.equal(getResponseErrorMessage(null), 'Request failed');
    assert.equal(getResponseErrorMessage('oops', 'Could not save.'), 'Could not save.');
  });
});
