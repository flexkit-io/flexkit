import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCreateTokenBody,
  describeTokenSpaces,
  findToken,
  parseSpaceFlags,
  parseTokenRole,
  tokenRows,
  type TokenDto,
} from '../src/commands/tokens/tokens';

function token(overrides: Partial<TokenDto>): TokenDto {
  return {
    id: 1,
    name: 'CI',
    role: 'Developer',
    created_at: '2026-11-03T10:00:00Z',
    last_digits: 'a1b2c3',
    created_by_name: 'Dana',
    spaces: [],
    ...overrides,
  };
}

describe('parseTokenRole', () => {
  it('defaults to viewer and accepts any case', () => {
    assert.equal(parseTokenRole(undefined), 'viewer');
    assert.equal(parseTokenRole(' Developer '), 'developer');
    assert.equal(parseTokenRole('editor'), 'editor');
  });

  it('refuses owner and unknown roles', () => {
    assert.throws(() => parseTokenRole('owner'), /Owner tokens cannot be created/);
    assert.throws(() => parseTokenRole('admin'), /Unknown role "admin"/);
  });
});

describe('parseSpaceFlags', () => {
  it('splits commas, trims and drops repeats', () => {
    assert.deepEqual(parseSpaceFlags(['sales', 'marketing, sales', ' ']), ['sales', 'marketing']);
    assert.deepEqual(parseSpaceFlags(undefined), []);
  });
});

describe('buildCreateTokenBody', () => {
  it('builds the request body', () => {
    assert.deepEqual(buildCreateTokenBody({ name: ' GitHub Actions ', role: 'developer', spaces: ['sales'] }), {
      name: 'GitHub Actions',
      role: 'developer',
      spaces: ['sales'],
    });
    assert.deepEqual(buildCreateTokenBody({ name: 'Storefront' }), { name: 'Storefront', role: 'viewer', spaces: [] });
  });

  it('requires a name', () => {
    assert.throws(() => buildCreateTokenBody({ name: '  ' }), /Give the token a name/);
  });
});

describe('tokenRows', () => {
  it('masks the token and describes the spaces', () => {
    const now = Date.parse('2026-11-03T13:00:00Z');

    assert.deepEqual(
      tokenRows(
        [
          token({}),
          token({
            id: 2,
            name: 'Sales',
            role: 'Viewer',
            last_digits: undefined,
            spaces: [{ code: 'sales', label: 'Sales' }],
          }),
        ],
        now
      ),
      [
        ['1', 'CI', 'developer', 'unrestricted only', '****a1b2c3', 'Dana', '3h ago'],
        ['2', 'Sales', 'viewer', 'sales', '', 'Dana', '3h ago'],
      ]
    );
    assert.equal(
      describeTokenSpaces([
        { code: 'a', label: 'A' },
        { code: 'b', label: 'B' },
      ]),
      'a, b'
    );
  });
});

describe('findToken', () => {
  const tokens = [
    token({ id: 1, name: 'CI' }),
    token({ id: 2, name: 'Sync' }),
    token({ id: 3, name: 'sync' }),
    token({ id: 4, name: '7' }),
  ];

  it('finds by id, then by exact name', () => {
    assert.equal(findToken(tokens, '2').name, 'Sync');
    assert.equal(findToken(tokens, 'ci').id, 1);
    assert.equal(findToken(tokens, '7').id, 4);
  });

  it('explains missing and ambiguous names', () => {
    assert.throws(() => findToken(tokens, 'nope'), /No token named "nope"/);
    assert.throws(() => findToken(tokens, 'SYNC'), /Several tokens are named "SYNC": 2, 3/);
  });
});
