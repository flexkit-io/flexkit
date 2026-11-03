import chalk from 'chalk';
import type Client from '../../util/client';
import {
  confirmAction,
  getApiErrorMessage,
  reportError,
  runCommandGroup,
  type Subcommand,
  type SubcommandContext,
} from '../../util/command-group';
import { isAPIError } from '../../util/error-utils';
import {
  formatRelativeTime,
  formatStatus,
  printDetails,
  printJson,
  printTable,
  truncate,
} from '../../util/output/format';
import { getCommandName } from '../../util/pkg';
import type { Approval, ApprovalDecisionResult, ApprovalsList, ApprovalStatus } from '../automations/types';
import {
  approvalsApproveCommand,
  approvalsCommand,
  approvalsDenyCommand,
  approvalsInspectCommand,
  approvalsListCommand,
} from './command';

const STATUSES: ApprovalStatus[] = ['pending', 'approved', 'rejected', 'expired', 'cancelled'];

/** Builds the list path; pending by default, every status with `all`. */
export function approvalsListPath({
  all,
  limit,
  offset,
  runId,
  status,
}: {
  all: boolean;
  limit: number;
  offset: number;
  runId?: string;
  status?: string;
}): string {
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  const effectiveStatus = status ?? (all ? undefined : 'pending');

  if (effectiveStatus) {
    if (!STATUSES.includes(effectiveStatus as ApprovalStatus)) {
      throw new Error(`Unknown status "${effectiveStatus}". Use one of: ${STATUSES.join(', ')}.`);
    }

    params.set('status', effectiveStatus);
  }

  if (runId) {
    params.set('runId', runId);
  }

  return `/automations/approvals?${params.toString()}`;
}

/** The body of `POST /automations/approvals/:id/decide`. */
export function decisionBody({
  approved,
  force,
  reason,
  remember,
}: {
  approved: boolean;
  force?: boolean;
  reason?: string;
  remember?: boolean;
}): Record<string, string | boolean> {
  return {
    approved,
    ...(force ? { force: true } : {}),
    ...(remember ? { remember: true } : {}),
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
}

function approvalPath(approvalId: string, suffix = ''): string {
  return `/automations/approvals/${encodeURIComponent(approvalId)}${suffix}`;
}

/** Reports approval API errors with hints for the cases a CLI user can fix. */
function reportApprovalError(client: Client, err: unknown): number {
  if (isAPIError(err)) {
    const message = getApiErrorMessage(err);

    if (err.status === 403 && /user session/i.test(message)) {
      client.output.error(
        `Approvals can only be read and decided by a signed-in member, not with an API token. Run ${getCommandName('login')} and try again.`
      );

      return 1;
    }

    if (err.errorCode === 'stale_preview') {
      client.output.error(
        `${message} Run ${getCommandName('approvals inspect <id>')} to review it, then approve again (or pass --force).`
      );

      return 1;
    }
  }

  return reportError(client, err);
}

/** Runs a subcommand body with the approval-specific error hints. */
function withApprovalErrors(
  run: (ctx: SubcommandContext) => Promise<number>
): (ctx: SubcommandContext) => Promise<number> {
  return async (ctx) => {
    try {
      return await run(ctx);
    } catch (err: unknown) {
      ctx.client.output.stopSpinner();

      return reportApprovalError(ctx.client, err);
    }
  };
}

function printApproval(client: Client, approval: Approval): void {
  printDetails(client, [
    ['ID', approval.id],
    ['Kind', approval.kind],
    ['Status', formatStatus(approval.status)],
    ['Summary', approval.operationsSummary],
    [
      'Automation',
      approval.automationName ? `${approval.automationName} (${approval.automationId ?? ''})` : approval.automationId,
    ],
    ['Run', approval.runId],
    ['Chat', approval.chatId],
    ['Affected records', approval.affectedCount],
    ['Requested', `${approval.requestedAt} (${formatRelativeTime(approval.requestedAt)})`],
    [
      'Expires',
      approval.status === 'pending' ? `${approval.expiresAt} (${formatRelativeTime(approval.expiresAt)})` : '',
    ],
    ['Decided', approval.decidedAt ? `${approval.decidedAt} (${formatRelativeTime(approval.decidedAt)})` : ''],
    ['Reason', approval.reason],
    ['Executed', approval.executedAt],
    ['Error', approval.error ? chalk.red(approval.error) : ''],
  ]);

  approval.operations.forEach((operation, index) => {
    client.output.print(`${chalk.dim(`Operation ${(index + 1).toString()}`)}\n${operation.query}\n`);

    if (operation.variables && Object.keys(operation.variables).length > 0) {
      client.output.print(`${chalk.dim('Variables')}\n${JSON.stringify(operation.variables, null, 2)}\n`);
    }

    client.output.print('\n');
  });

  if (approval.preview) {
    client.output.dim(
      `The full before/after preview is in ${getCommandName(`approvals inspect ${approval.id} --json`)}.`
    );
  }
}

const ls: Subcommand = {
  command: approvalsListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: {
    '--all': Boolean,
    '--status': String,
    '-s': '--status',
    '--run': String,
    '-r': '--run',
    '--limit': Number,
    '-n': '--limit',
    '--offset': Number,
  },
  run: withApprovalErrors(async (ctx) => {
    const { client, flags, projectId } = ctx;
    const rawLimit = flags['--limit'] as number | undefined;
    const rawOffset = flags['--offset'] as number | undefined;
    const limit = rawLimit && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 25;
    const offset = rawOffset && rawOffset > 0 ? Math.floor(rawOffset) : 0;
    const status = flags['--status'] as string | undefined;
    const listPath = approvalsListPath({
      all: Boolean(flags['--all']),
      limit,
      offset,
      runId: flags['--run'] as string | undefined,
      status,
    });
    const res = await client.fetch<ApprovalsList>(listPath, { projectId });

    if (ctx.json) {
      printJson(client, res);

      return 0;
    }

    const showingPending = !flags['--all'] && (!status || status === 'pending');

    printTable(
      client,
      ['ID', 'KIND', 'SUMMARY', 'SOURCE', 'STATUS', showingPending ? 'EXPIRES' : 'REQUESTED'],
      res.approvals.map((approval) => [
        approval.id,
        approval.kind,
        truncate(approval.operationsSummary, 48),
        truncate(approval.automationName || (approval.chatId ? 'Chat' : ''), 28),
        formatStatus(approval.status),
        formatRelativeTime(showingPending ? approval.expiresAt : approval.requestedAt),
      ]),
      showingPending ? 'No pending approval requests.' : 'No approval requests found.'
    );

    if (res.hasMore) {
      client.output.dim(`More requests available: pass --offset ${(offset + limit).toString()}.`);
    }

    if (!showingPending && res.pendingCount > 0) {
      client.output.dim(`${res.pendingCount.toString()} pending in total.`);
    }

    return 0;
  }),
};

const inspect: Subcommand = {
  command: approvalsInspectCommand,
  aliases: ['get'],
  needsProject: true,
  run: withApprovalErrors(async (ctx) => {
    const { client, projectId } = ctx;
    const res = await client.fetch<{ approval: Approval }>(approvalPath(ctx.args[0] as string), { projectId });

    if (ctx.json) {
      printJson(client, res);

      return 0;
    }

    printApproval(client, res.approval);

    return 0;
  }),
};

async function decide(ctx: SubcommandContext, approved: boolean): Promise<number> {
  const { client, flags, projectId } = ctx;
  const approvalId = ctx.args[0] as string;

  if (approved && !ctx.yes) {
    const { approval } = await client.fetch<{ approval: Approval }>(approvalPath(approvalId), { projectId });

    if (approval.status !== 'pending') {
      client.output.error(`This request was already decided (${approval.status}).`);

      return 1;
    }

    const affected = approval.affectedCount !== null ? ` (${approval.affectedCount.toString()} records)` : '';

    if (!(await confirmAction(ctx, `Approve "${truncate(approval.operationsSummary, 80)}"${affected}?`))) {
      return 1;
    }
  }

  const res = await client.fetch<ApprovalDecisionResult>(approvalPath(approvalId, '/decide'), {
    method: 'POST',
    projectId,
    body: decisionBody({
      approved,
      force: Boolean(flags['--force']),
      reason: flags['--reason'] as string | undefined,
      remember: Boolean(flags['--remember']),
    }),
  });

  if (ctx.json) {
    printJson(client, res);

    return 0;
  }

  const { approval } = res;

  if (approved) {
    client.output.success(`Approved ${chalk.bold(approvalId)}.`);

    if (approval?.error) {
      client.output.error(`The approved change failed: ${approval.error}`);

      return 1;
    }
  } else {
    client.output.success(`Rejected ${chalk.bold(approvalId)}.`);
  }

  return 0;
}

const approve: Subcommand = {
  command: approvalsApproveCommand,
  needsProject: true,
  flags: { '--reason': String, '--remember': Boolean, '--force': Boolean },
  run: withApprovalErrors((ctx) => decide(ctx, true)),
};

const deny: Subcommand = {
  command: approvalsDenyCommand,
  aliases: ['reject'],
  needsProject: true,
  flags: { '--reason': String },
  run: withApprovalErrors((ctx) => decide(ctx, false)),
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: approvalsCommand,
    subcommands: [ls, inspect, approve, deny],
    defaultSubcommand: 'ls',
  });
}
