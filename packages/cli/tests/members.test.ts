import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  invitationRow,
  inviteNote,
  memberRow,
  parseEmails,
  parseRole,
  parseRoleFilter,
  sortMembers,
  type MemberDto,
} from '../src/commands/members/members';

function member(overrides: Partial<MemberDto>): MemberDto {
  return { avatarUrl: null, displayName: 'Ana', email: 'ana@acme.com', id: 'u1', role: 'viewer', ...overrides };
}

describe('parseRole', () => {
  it('accepts project roles in any case', () => {
    assert.equal(parseRole('Developer'), 'developer');
    assert.equal(parseRole(' owner '), 'owner');
  });

  it('rejects other roles and missing values', () => {
    assert.throws(() => parseRole('admin'), /Unknown role "admin"/);
    assert.throws(() => parseRole('billing', '--role'), /Unknown --role/);
    assert.throws(() => parseRole(undefined), /Pass a role/);
  });
});

describe('parseEmails', () => {
  it('splits, trims and de-duplicates', () => {
    assert.deepEqual(parseEmails(['ana@acme.com,ben@acme.com', 'ANA@acme.com', ' cleo@acme.com\n']), [
      'ana@acme.com',
      'ben@acme.com',
      'cleo@acme.com',
    ]);
  });

  it('rejects invalid or missing emails', () => {
    assert.throws(() => parseEmails(['ana']), /Invalid email address: ana/);
    assert.throws(() => parseEmails([' , ']), /at least one email/);
  });
});

describe('parseRoleFilter', () => {
  it('reads a comma separated list', () => {
    assert.equal(parseRoleFilter(undefined), null);
    assert.deepEqual(parseRoleFilter('owner, Developer'), ['owner', 'developer']);
    assert.throws(() => parseRoleFilter('owner,admin'), /Unknown --role "admin"/);
  });
});

describe('rows', () => {
  it('sorts owners first, then by name', () => {
    const sorted = sortMembers([
      member({ id: 'v', displayName: 'Zed', role: 'viewer' }),
      member({ id: 'd', displayName: 'Bob', role: 'developer' }),
      member({ id: 'o2', displayName: 'Yan', role: 'owner' }),
      member({ id: 'o1', displayName: 'Ann', role: 'owner' }),
    ]);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ['o1', 'o2', 'd', 'v']
    );
  });

  it('leaves the name empty when it is just the email', () => {
    assert.deepEqual(memberRow(member({})), ['u1', 'Ana', 'ana@acme.com', 'viewer']);
    assert.deepEqual(memberRow(member({ displayName: 'ana@acme.com' })), ['u1', '', 'ana@acme.com', 'viewer']);
  });

  it('formats invitations', () => {
    assert.deepEqual(
      invitationRow(
        {
          email: 'ben@acme.com',
          id: 'i1',
          invitedAt: '',
          invitedBy: { displayName: 'Ana', userId: 'u1' },
          role: 'editor',
        },
        '2h ago'
      ),
      ['i1', 'ben@acme.com', 'editor', '2h ago', 'Ana']
    );
    assert.deepEqual(invitationRow({ email: 'b@x.io', id: 'i2', invitedAt: '', invitedBy: null, role: 'viewer' }, ''), [
      'i2',
      'b@x.io',
      'viewer',
      '',
      '',
    ]);
  });
});

describe('inviteNote', () => {
  it('returns the partial-success message only', () => {
    assert.equal(inviteNote({ errorCode: '', errorMessage: '', members: [], success: true }), null);
    assert.equal(
      inviteNote({
        errorCode: 'partial_success',
        errorMessage: 'ana@acme.com is already a member.',
        members: [],
        success: true,
      }),
      'ana@acme.com is already a member.'
    );
  });
});
