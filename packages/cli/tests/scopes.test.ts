import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getScopeNames, type ConfiguredProject } from '../src/util/import/schema';

const project = (scopes: ConfiguredProject['scopes']) => ({ scopes }) as ConfiguredProject;

describe('getScopeNames', () => {
  it('puts the default scope first, whatever it is named', () => {
    assert.deepEqual(
      getScopeNames(
        project([
          { name: 'uk', label: 'United Kingdom' },
          { name: 'eu', label: 'Europe', isDefault: true },
          { name: 'us', label: 'United States' },
        ])
      ),
      ['eu', 'uk', 'us']
    );
  });

  it('keeps a scope named "default" and uses it for projects without scopes', () => {
    assert.deepEqual(
      getScopeNames(
        project([
          { name: 'default', label: 'Default', isDefault: true },
          { name: 'es', label: 'Spanish' },
        ])
      ),
      ['default', 'es']
    );
    assert.deepEqual(getScopeNames(project(undefined)), ['default']);
  });
});
