import chalk from 'chalk';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand } from '../../util/command-group';
import { formatRelativeTime, printJson, printTable } from '../../util/output/format';
import {
  membersCommand,
  membersInvitationsCommand,
  membersInviteCommand,
  membersListCommand,
  membersRemoveCommand,
  membersRoleCommand,
} from './command';
import {
  invitationRow,
  inviteNote,
  memberRow,
  parseEmails,
  parseRole,
  parseRoleFilter,
  sortMembers,
  type InvitationDto,
  type InviteResponse,
  type MemberDto,
} from './members';

const ls: Subcommand = {
  command: membersListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: { '--role': String },
  async run(ctx) {
    const roles = parseRoleFilter(ctx.flags['--role'] as string | undefined);
    const { members } = await ctx.client.fetch<{ members: MemberDto[] }>('/members', { projectId: ctx.projectId });
    const shown = sortMembers(roles ? members.filter((member) => (roles as string[]).includes(member.role)) : members);

    if (ctx.json) {
      printJson(ctx.client, { members: shown });

      return 0;
    }

    printTable(
      ctx.client,
      ['ID', 'NAME', 'EMAIL', 'ROLE'],
      shown.map((member) => {
        const [id = '', ...rest] = memberRow(member);

        return [chalk.dim(id), ...rest];
      }),
      roles ? 'No members with these roles.' : 'No members.'
    );

    return 0;
  },
};

const invite: Subcommand = {
  command: membersInviteCommand,
  aliases: ['add'],
  needsProject: true,
  flags: { '--role': String, '-r': '--role' },
  async run(ctx) {
    const emails = parseEmails(ctx.args);
    const roleFlag = ctx.flags['--role'] as string | undefined;
    const role = roleFlag === undefined ? 'viewer' : parseRole(roleFlag, '--role');
    const response = await ctx.client.fetch<InviteResponse>('/members', {
      method: 'POST',
      body: { emails, role },
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, response);

      return 0;
    }

    for (const member of response.members) {
      ctx.client.output.success(`${member.email} is now ${chalk.bold(member.role)} in the project`);
    }

    const note = inviteNote(response);

    if (note) {
      ctx.client.output.warn(note);
    }

    return 0;
  },
};

const role: Subcommand = {
  command: membersRoleCommand,
  needsProject: true,
  async run(ctx) {
    const [member = '', roleArg] = ctx.args;
    const newRole = parseRole(roleArg);
    const response = await ctx.client.fetch<{ member: { id: string; role: string }; success: boolean }>(
      `/members/${encodeURIComponent(member)}`,
      { method: 'PATCH', body: { role: newRole }, projectId: ctx.projectId }
    );

    if (ctx.json) {
      printJson(ctx.client, response);

      return 0;
    }

    ctx.client.output.success(`${member} is now ${chalk.bold(newRole)}`);

    return 0;
  },
};

const rm: Subcommand = {
  command: membersRemoveCommand,
  aliases: ['remove'],
  needsProject: true,
  async run(ctx) {
    const member = ctx.args[0] as string;

    if (!(await confirmAction(ctx, `Remove ${member} from project ${ctx.projectId}?`))) {
      return 1;
    }

    const response = await ctx.client.fetch<{ id: string; success: boolean }>(
      `/members/${encodeURIComponent(member)}`,
      { method: 'DELETE', projectId: ctx.projectId }
    );

    if (ctx.json) {
      printJson(ctx.client, response);

      return 0;
    }

    ctx.client.output.success(`Removed ${member} from the project`);

    return 0;
  },
};

const invitations: Subcommand = {
  command: membersInvitationsCommand,
  aliases: ['invites'],
  needsProject: true,
  async run(ctx) {
    const [action, target] = ctx.args;

    if (action === undefined || action === 'ls' || action === 'list') {
      const result = await ctx.client.fetch<{ invitations: InvitationDto[] }>('/members/invitations', {
        projectId: ctx.projectId,
      });

      if (ctx.json) {
        printJson(ctx.client, result);

        return 0;
      }

      printTable(
        ctx.client,
        ['ID', 'EMAIL', 'ROLE', 'INVITED', 'BY'],
        result.invitations.map((invitation) => {
          const [id = '', ...rest] = invitationRow(invitation, formatRelativeTime(invitation.invitedAt));

          return [chalk.dim(id), ...rest];
        }),
        'No pending invitations.'
      );

      return 0;
    }

    if (action !== 'cancel' && action !== 'rm') {
      throw new Error(
        `Unknown action "${action}". Use \`flexkit members invitations\` to list or \`flexkit members invitations cancel <id|email>\`.`
      );
    }

    if (!target) {
      throw new Error('Pass the invitation id or the invited email: `flexkit members invitations cancel <id|email>`.');
    }

    if (!(await confirmAction(ctx, `Cancel the invitation of ${target}?`))) {
      return 1;
    }

    const response = await ctx.client.fetch<{ email: string; id: string; success: boolean }>(
      `/members/invitations/${encodeURIComponent(target)}`,
      { method: 'DELETE', projectId: ctx.projectId }
    );

    if (ctx.json) {
      printJson(ctx.client, response);

      return 0;
    }

    ctx.client.output.success(`Canceled the invitation of ${response.email}`);

    return 0;
  },
};

export default async function membersCommandMain(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: membersCommand,
    subcommands: [ls, invite, role, rm, invitations],
    defaultSubcommand: 'ls',
  });
}
