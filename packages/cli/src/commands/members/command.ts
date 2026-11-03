import type { Command, CommandOption } from '../help';

function option(
  name: string,
  type: CommandOption['type'],
  description: string,
  argument?: string,
  shorthand: string | null = null
): CommandOption {
  return { name, shorthand, type, argument, description, deprecated: false };
}

const jsonOption = option('json', Boolean, 'Print the API response as JSON on stdout');
const projectOption = option('project', String, 'Project to use (default: linked project)', 'ID', 'p');
const yesOption = option('yes', Boolean, 'Skip the confirmation prompt', undefined, 'y');

export const membersListCommand: Command = {
  name: 'ls',
  description: 'List the members of the project with their roles. Needs an owner or developer.',
  arguments: [],
  options: [
    option('role', String, 'Only these roles, comma separated (owner,developer,contributor,editor,viewer)', 'LIST'),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List members', value: 'flexkit members ls' },
    { name: 'Only owners and developers', value: 'flexkit members ls --role owner,developer' },
    { name: 'Emails of every member', value: "flexkit members ls --json | jq -r '.members[].email'" },
  ],
};

export const membersInviteCommand: Command = {
  name: 'invite',
  description:
    'Invite people by email with a role. People without a Flexkit account get an invitation email; people already in the project get the new role. Only owners can invite owners.',
  arguments: [{ name: 'email...', required: true }],
  options: [
    option(
      'role',
      String,
      'Role to give: owner, developer, contributor, editor or viewer (default: viewer)',
      'ROLE',
      'r'
    ),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Invite a viewer', value: 'flexkit members invite ana@acme.com' },
    { name: 'Invite two developers', value: 'flexkit members invite ana@acme.com ben@acme.com --role developer' },
    {
      name: 'Invite everyone in a file, one email per line',
      value: 'flexkit members invite $(cat team.txt) --role editor',
    },
  ],
};

export const membersRoleCommand: Command = {
  name: 'role',
  description:
    "Change a member's role. The member is a user id or an email. Only owners can make someone an owner or change an owner's role, and the last owner keeps the role.",
  arguments: [
    { name: 'member', required: true },
    { name: 'role', required: true },
  ],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Make a member a developer', value: 'flexkit members role ana@acme.com developer' },
    { name: 'Hand over ownership', value: 'flexkit members role ben@acme.com owner' },
    {
      name: 'Downgrade by user id',
      value: 'flexkit members role 3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f viewer',
    },
  ],
};

export const membersRemoveCommand: Command = {
  name: 'rm',
  description:
    'Remove a member from the project (user id or email). Anyone can remove themselves; removing someone else takes an owner or developer, and removing an owner takes an owner. The last owner cannot be removed.',
  arguments: [{ name: 'member', required: true }],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'Remove a member', value: 'flexkit members rm ana@acme.com' },
    { name: 'Remove without asking (scripts)', value: 'flexkit members rm ana@acme.com --yes' },
  ],
};

export const membersInvitationsCommand: Command = {
  name: 'invitations',
  description:
    "List pending invitations (people invited who haven't accepted yet), or cancel one with `invitations cancel <id|email>`. Cancelling takes an owner or developer.",
  arguments: [
    { name: 'cancel', required: false },
    { name: 'id|email', required: false },
  ],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'List pending invitations', value: 'flexkit members invitations' },
    { name: 'Cancel an invitation by email', value: 'flexkit members invitations cancel ana@acme.com' },
    {
      name: 'Cancel by id without asking',
      value: 'flexkit members invitations cancel 3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f --yes',
    },
  ],
};

export const membersCommand: Command = {
  name: 'members',
  description:
    'Manage the people in a project: list members, invite by email, change roles, remove members and cancel invitations. Needs a signed-in user (`flexkit login`); API tokens cannot manage members.',
  arguments: [],
  subcommands: [
    membersListCommand,
    membersInviteCommand,
    membersRoleCommand,
    membersRemoveCommand,
    membersInvitationsCommand,
  ],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'List members', value: 'flexkit members ls' },
    { name: 'Invite a developer', value: 'flexkit members invite ana@acme.com --role developer' },
    { name: 'Change a role', value: 'flexkit members role ana@acme.com viewer' },
    { name: 'See pending invitations', value: 'flexkit members invitations' },
  ],
};
