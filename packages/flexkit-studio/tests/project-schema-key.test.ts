import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isProjectSchemaKey } from '../src/core/config/use-project-schemas';

describe('isProjectSchemaKey', () => {
  it('matches the single- and multi-project schema keys that include the project', () => {
    assert.equal(isProjectSchemaKey(['project-schema', 'user', 'abc'], 'abc'), true);
    assert.equal(isProjectSchemaKey(['project-schemas', 'user', 'xyz', 'abc'], 'abc'), true);
  });

  it('ignores other keys', () => {
    assert.equal(isProjectSchemaKey(['project-schema', 'user', 'other'], 'abc'), false);
    assert.equal(isProjectSchemaKey(['project-schema', 'abc'], 'abc'), false);
    assert.equal(isProjectSchemaKey('/api/flexkit/abc/schema', 'abc'), false);
    assert.equal(isProjectSchemaKey(null, 'abc'), false);
  });
});
