import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCapabilities } from '../src/core/capabilities';

const ALL = {
  canCreatePersonalAutomations: true,
  canDeleteRecords: true, canImportRecords: true, canManageKnowledge: true, canRunBulkChanges: true };
const NONE = {
  canCreatePersonalAutomations: false,
  canDeleteRecords: false, canImportRecords: false, canManageKnowledge: false, canRunBulkChanges: false };

describe('capabilities sent by the backend', () => {
  it('gives a viewer nothing', () => {
    assert.deepEqual(resolveCapabilities({ role: 'viewer', capabilities: NONE }), NONE);
  });

  it('keeps delete and Knowledge management from a contributor', () => {
    const capabilities = { ...NONE, canImportRecords: true };
    const resolved = resolveCapabilities({ role: 'contributor', capabilities });

    assert.deepEqual(resolved, capabilities);
    assert.equal(resolved.canDeleteRecords, false);
    assert.equal(resolved.canManageKnowledge, false);
  });

  it('lets an editor delete and manage Knowledge', () => {
    const capabilities = { ...ALL, canRunBulkChanges: false };

    assert.deepEqual(resolveCapabilities({ role: 'editor', capabilities }), capabilities);
  });

  it('gives developers and owners everything', () => {
    assert.deepEqual(resolveCapabilities({ role: 'developer', capabilities: ALL }), ALL);
    assert.deepEqual(resolveCapabilities({ role: 'owner', capabilities: ALL }), ALL);
  });

  it('trusts the capabilities over the role name', () => {
    // A role this Studio has never heard of still gets exactly what the backend says.
    assert.deepEqual(resolveCapabilities({ role: 'reviewer', capabilities: NONE }), NONE);
    assert.deepEqual(resolveCapabilities({ role: 'viewer', capabilities: ALL }), ALL);
  });
});

describe('personal automations', () => {
  it('follows the backend for an editor or contributor', () => {
    assert.equal(
      resolveCapabilities({ role: 'editor', capabilities: { ...ALL, canCreatePersonalAutomations: false } })
        .canCreatePersonalAutomations,
      false
    );
    assert.equal(
      resolveCapabilities({ role: 'contributor', capabilities: { ...NONE, canCreatePersonalAutomations: true } })
        .canCreatePersonalAutomations,
      true
    );
  });

  it('offers New Automation to every member but a viewer on an older backend, as before', () => {
    assert.equal(resolveCapabilities({ role: 'viewer' }).canCreatePersonalAutomations, false);
    assert.equal(resolveCapabilities({ role: 'contributor' }).canCreatePersonalAutomations, true);
    assert.equal(
      resolveCapabilities({ role: 'editor', capabilities: { canDeleteRecords: true } }).canCreatePersonalAutomations,
      true
    );
  });
});

describe('an older backend that sends no capabilities', () => {
  it('offers nothing to a viewer, as before', () => {
    assert.deepEqual(resolveCapabilities({ role: 'viewer' }), NONE);
  });

  it('offers everything to any other role, as before', () => {
    for (const role of ['contributor', 'editor', 'developer', 'owner']) {
      assert.deepEqual(resolveCapabilities({ role }), ALL, role);
    }
  });

  it('keeps actions enabled while the user is still loading, as before', () => {
    assert.deepEqual(resolveCapabilities(undefined), ALL);
    assert.deepEqual(resolveCapabilities(null), ALL);
    assert.deepEqual(resolveCapabilities({ role: null }), ALL);
  });
});

describe('a partial or malformed capabilities object', () => {
  it('falls back to the role for each missing capability', () => {
    assert.deepEqual(resolveCapabilities({ role: 'contributor', capabilities: { canDeleteRecords: false } }), {
      ...ALL,
      canDeleteRecords: false,
    });
    assert.deepEqual(resolveCapabilities({ role: 'viewer', capabilities: { canDeleteRecords: true } }), {
      ...NONE,
      canDeleteRecords: true,
    });
  });

  it('ignores values that are not booleans', () => {
    const capabilities = {
      canDeleteRecords: 'yes',
      canImportRecords: 1,
      canManageKnowledge: null,
      canRunBulkChanges: {},
    };

    assert.deepEqual(resolveCapabilities({ role: 'viewer', capabilities }), NONE);
    assert.deepEqual(resolveCapabilities({ role: 'editor', capabilities }), ALL);
  });

  it('ignores a capabilities value that is not an object', () => {
    for (const capabilities of [null, 'all', 7, true, ['canDeleteRecords']]) {
      assert.deepEqual(resolveCapabilities({ role: 'viewer', capabilities }), NONE);
      assert.deepEqual(resolveCapabilities({ role: 'contributor', capabilities }), ALL);
    }
  });
});
