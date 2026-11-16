import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Command } from '../src/commands/help';
import {
  membersInviteCommand,
  membersListCommand,
  membersRoleCommand,
  ROLES_HELP,
} from '../src/commands/members/command';
import { PROJECT_ROLES, parseRole, sortMembers, type MemberDto } from '../src/commands/members/members';
import { projectPauseCommand, projectUnpauseCommand } from '../src/commands/project/command';
import { tokensCreateCommand } from '../src/commands/tokens/command';
import { TOKEN_ROLES, parseTokenRole } from '../src/commands/tokens/tokens';
import { formatGraphQLErrors } from '../src/util/graphql';

function roleOption(command: Command): string {
  return command.options.find((item) => item.name === 'role')?.description ?? '';
}

function member(id: string, role: string): MemberDto {
  return { avatarUrl: null, displayName: 'Ana', email: 'ana@acme.com', id, role };
}

describe('member roles', () => {
  it('are listed as a ladder, lowest first', () => {
    assert.deepEqual([...PROJECT_ROLES], ['viewer', 'contributor', 'editor', 'developer', 'owner']);
    assert.throws(() => parseRole('admin'), /Use one of: viewer, contributor, editor, developer, owner\./);
    assert.throws(() => parseRole(undefined), /Pass a role: viewer, contributor, editor, developer, owner\./);
    assert.match(roleOption(membersInviteCommand), /viewer, contributor, editor, developer or owner/);
    assert.match(roleOption(membersListCommand), /\(viewer,contributor,editor,developer,owner\)/);
  });

  it('are explained where a role is chosen', () => {
    assert.match(ROLES_HELP, /viewer reads; contributor creates and edits records/);
    assert.match(ROLES_HELP, /editor also deletes records and manages Knowledge documents/);
    assert.match(ROLES_HELP, /developer and owner also set up the project/);
    assert.ok(membersInviteCommand.description.endsWith(ROLES_HELP));
    assert.ok(membersRoleCommand.description.endsWith(ROLES_HELP));
  });

  it('sort from the top of the ladder, editors above contributors', () => {
    const sorted = sortMembers([
      member('c', 'contributor'),
      member('v', 'viewer'),
      member('e', 'editor'),
      member('x', 'something-new'),
      member('o', 'owner'),
      member('d', 'developer'),
    ]);

    assert.deepEqual(
      sorted.map((item) => item.id),
      ['o', 'd', 'e', 'c', 'v', 'x']
    );
  });
});

describe('token roles', () => {
  it('are listed as a ladder, lowest first, without owner', () => {
    assert.deepEqual([...TOKEN_ROLES], ['viewer', 'contributor', 'editor', 'developer']);
    assert.throws(() => parseTokenRole('admin'), /Use one of: viewer, contributor, editor, developer\./);
    assert.match(roleOption(tokensCreateCommand), /viewer, contributor, editor or developer/);
  });

  it('are explained on `tokens create`', () => {
    assert.match(
      tokensCreateCommand.description,
      /an editor token also deletes records and manages Knowledge documents/
    );
  });
});

describe('project pause help', () => {
  it('names owners and developers', () => {
    assert.match(projectPauseCommand.description, /until an owner or developer unpauses it/);
    assert.match(projectPauseCommand.description, /Owners and developers only/);
    assert.match(projectUnpauseCommand.description, /Owners and developers only/);
    assert.doesNotMatch(projectPauseCommand.description, /Owners only/);
    assert.doesNotMatch(projectUnpauseCommand.description, /Owners only/);
  });
});

describe('a delete the role may not make', () => {
  it('is reported in the server’s own words', () => {
    const sentence = 'Your role (Contributor) cannot delete records. Ask a project owner for the Editor role.';

    assert.equal(formatGraphQLErrors([{ message: sentence, extensions: { code: 'FORBIDDEN_DELETE' } }]), sentence);
  });
});
