import chalk from 'chalk';
import type Client from '../../util/client';
import { runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { isAPIError, isObject } from '../../util/error-utils';
import {
  formatRelativeTime,
  formatStatus,
  printDetails,
  printJson,
  printTable,
  truncate,
} from '../../util/output/format';
import { parseEventJson, readEventStream } from '../../util/sse';
import { getCommandName } from '../../util/pkg';
import { diffSchemas, type SchemaSnapshot } from '../schema/diff';
import { renderSchemaDiff } from '../schema/render-diff';
import { deploymentsCommand, deploymentsInspectCommand, deploymentsLogsCommand, deploymentsLsCommand } from './command';

const STATES = ['queued', 'validating', 'building', 'uploading', 'activating', 'completed', 'failed'] as const;
const TERMINAL = new Set(['completed', 'failed']);
const PAGE_SIZE = 25;

interface DeploymentActor {
  kind: 'user' | 'api_token';
  id: string;
  label: string;
  via?: 'cli' | 'agent';
}

interface ValidationIssue {
  code?: string;
  path?: (string | number)[];
  message: string;
  hint?: string;
  helpUrl?: string;
}

interface DeploymentListItem {
  id: string;
  schema_hash: string;
  state: string;
  progress: { phase?: string; stage?: string; message?: string } | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  actor: DeploymentActor | null;
  summary: { entities: number; properties: number; scopes: number; spaces: number } | null;
}

interface DeploymentPage {
  items: DeploymentListItem[];
  nextCursor: string | null;
  hasActive: boolean;
  activeDeploymentId: string | null;
}

interface DeploymentSnapshotResponse {
  schema: SchemaSnapshot['schema'];
  scopes: SchemaSnapshot['scopes'];
  spaces: SchemaSnapshot['spaces'];
  studioConfig?: { title?: string; menuGroups?: SchemaSnapshot['menuGroups'] } | null;
  schemaHash: string | null;
}

interface StageEntry {
  stage: string;
  state: string;
  at: string;
  message?: string;
}

interface DeploymentDetail extends DeploymentListItem {
  error: { code: string; message: string; hint?: string; stage?: string; details?: ValidationIssue[] } | null;
  warnings: ValidationIssue[] | null;
  stage_history: StageEntry[] | null;
  snapshot?: DeploymentSnapshotResponse;
  baseline?: DeploymentSnapshotResponse | null;
  deployment_options?: { forceDeploy: boolean; allowBreakingChanges: boolean } | null;
}

/** `GET /deploy/jobs/:id` on the project API (accepts CLI sessions and API tokens). */
interface DeployJob {
  id: string;
  state: string;
  schemaHash: string;
  progress: DeploymentListItem['progress'];
  error: DeploymentDetail['error'];
  timestamps: { createdAt: string; updatedAt: string; startedAt: string | null; completedAt: string | null };
}

function deploymentsPath(projectId: string, suffix = ''): string {
  return `/api/projects/${encodeURIComponent(projectId)}/deployments${suffix}`;
}

/** Same encoding as the server's `nextCursor`, so a listing cut short by --limit can continue exactly. */
function encodeCursor(item: DeploymentListItem): string {
  return Buffer.from(JSON.stringify({ at: item.created_at, id: item.id })).toString('base64url');
}

export function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) {
    return '';
  }

  const ms = Date.parse(end) - Date.parse(start);

  if (Number.isNaN(ms) || ms < 0) {
    return '';
  }

  const seconds = Math.round(ms / 1000);

  if (seconds < 60) {
    return `${seconds.toString()}s`;
  }

  const minutes = Math.floor(seconds / 60);

  return `${minutes.toString()}m ${(seconds % 60).toString()}s`;
}

function formatActor(actor: DeploymentActor | null): string {
  if (!actor) {
    return '';
  }

  return actor.via ? `${actor.label} ${chalk.dim(`via ${actor.via}`)}` : actor.label;
}

function formatSummary(summary: DeploymentListItem['summary']): string {
  if (!summary) {
    return '';
  }

  return `${summary.entities.toString()} entities, ${summary.properties.toString()} attributes`;
}

function jobToDetail(job: DeployJob): DeploymentDetail {
  return {
    id: job.id,
    schema_hash: job.schemaHash,
    state: job.state,
    progress: job.progress,
    created_at: job.timestamps.createdAt,
    updated_at: job.timestamps.updatedAt,
    started_at: job.timestamps.startedAt,
    completed_at: job.timestamps.completedAt,
    actor: null,
    summary: null,
    error: job.error,
    warnings: null,
    stage_history: null,
  };
}

/**
 * Loads a deployment from the account API. When that API refuses the CLI
 * credentials (401), falls back to the project deploy-job API, which has
 * fewer fields (no actor, summary, stage history or snapshots).
 */
async function loadDeployment(
  ctx: SubcommandContext,
  id: string,
  view?: 'status'
): Promise<{ detail: DeploymentDetail; partial: boolean }> {
  try {
    const detail = await ctx.client.fetch<DeploymentDetail>(
      deploymentsPath(ctx.projectId, `/${encodeURIComponent(id)}${view ? `?view=${view}` : ''}`)
    );

    return { detail, partial: false };
  } catch (err: unknown) {
    if (!isAPIError(err) || err.status !== 401) {
      throw err;
    }

    ctx.client.output.debug('The deployments API refused the CLI credentials; using the deploy job API instead.');
    const job = await ctx.client.fetch<DeployJob>(`/deploy/jobs/${encodeURIComponent(id)}`, {
      projectId: ctx.projectId,
    });

    return { detail: jobToDetail(job), partial: true };
  }
}

const ls: Subcommand = {
  command: deploymentsLsCommand,
  aliases: ['list'],
  needsProject: true,
  flags: {
    '--state': String,
    '-s': '--state',
    '--mine': Boolean,
    '-m': '--mine',
    '--limit': Number,
    '-n': '--limit',
    '--cursor': String,
  },
  async run(ctx) {
    const { client } = ctx;
    const state = (ctx.flags['--state'] as string | undefined)?.toLowerCase();
    const limit = (ctx.flags['--limit'] as number | undefined) ?? PAGE_SIZE;

    if (state && state !== 'all' && state !== 'running' && !(STATES as readonly string[]).includes(state)) {
      client.output.error(`Unknown state "${state}". Use one of: running, ${STATES.join(', ')}.`);

      return 1;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      client.output.error('--limit must be a positive whole number.');

      return 1;
    }

    const items: DeploymentListItem[] = [];
    let cursor = ctx.flags['--cursor'] as string | undefined;
    let page: DeploymentPage | undefined;

    client.output.spinner('Loading deployments');

    try {
      do {
        const params = new URLSearchParams();

        if (state) params.set('status', state);
        if (ctx.flags['--mine']) params.set('author', 'me');
        if (cursor) params.set('cursor', cursor);

        const query = params.toString();
        page = await client.fetch<DeploymentPage>(deploymentsPath(ctx.projectId, query ? `?${query}` : ''));
        items.push(...page.items);
        cursor = page.nextCursor ?? undefined;
      } while (cursor && items.length < limit);
    } finally {
      client.output.stopSpinner();
    }

    const shown = items.slice(0, limit);
    const last = shown.at(-1);
    const nextCursor = items.length > limit && last ? encodeCursor(last) : (page.nextCursor ?? null);

    if (ctx.json) {
      printJson(client, {
        items: shown,
        nextCursor,
        hasActive: page.hasActive,
        activeDeploymentId: page.activeDeploymentId,
      });

      return 0;
    }

    printTable(
      client,
      ['ID', 'STATE', 'SCHEMA', 'AUTHOR', 'CREATED', 'DURATION'],
      shown.map((item) => [
        item.id === page?.activeDeploymentId ? `${item.id} ${chalk.cyan('● live')}` : item.id,
        formatStatus(item.state),
        formatSummary(item.summary),
        formatActor(item.actor),
        formatRelativeTime(item.created_at),
        formatDuration(item.started_at ?? item.created_at, item.completed_at),
      ]),
      state || ctx.flags['--mine']
        ? 'No deployments match these filters.'
        : `No deployments yet. Run ${getCommandName('deploy')} to deploy your schema.`
    );

    if (nextCursor) {
      client.output.dim(`More deployments: ${getCommandName(`deployments ls --cursor ${nextCursor}`)}`);
    }

    return 0;
  },
};

function formatIssuePath(path: ValidationIssue['path']): string {
  return path && path.length > 0 ? path.map(String).join('.') : '';
}

function printIssues(client: Client, title: string, issues: ValidationIssue[], color: (text: string) => string): void {
  if (issues.length === 0) {
    return;
  }

  client.output.print(`\n${chalk.bold(title)}\n`);

  for (const issue of issues) {
    const where = formatIssuePath(issue.path);
    client.output.print(`  ${color(issue.code ?? 'issue')} ${where ? `${chalk.dim(where)} ` : ''}${issue.message}\n`);

    if (issue.hint) {
      client.output.print(`    ${chalk.dim(`hint: ${issue.hint}`)}\n`);
    }

    if (issue.helpUrl) {
      client.output.print(`    ${chalk.dim(issue.helpUrl)}\n`);
    }
  }
}

function printStageHistory(client: Client, history: StageEntry[]): void {
  if (history.length === 0) {
    return;
  }

  client.output.print(`\n${chalk.bold('Stages')}\n`);
  printTable(
    client,
    ['TIME', 'STAGE', 'STATE', 'MESSAGE'],
    history.map((entry) => [
      new Date(entry.at).toLocaleTimeString(),
      entry.stage,
      formatStatus(entry.state),
      truncate(entry.message, 80),
    ])
  );
}

function toDiffSnapshot(snapshot: DeploymentSnapshotResponse): SchemaSnapshot {
  return {
    title: snapshot.studioConfig?.title,
    menuGroups: snapshot.studioConfig?.menuGroups ?? [],
    schema: snapshot.schema,
    scopes: snapshot.scopes,
    spaces: snapshot.spaces,
  };
}

const inspect: Subcommand = {
  command: deploymentsInspectCommand,
  aliases: ['get'],
  needsProject: true,
  flags: { '--diff': Boolean },
  async run(ctx) {
    const { client } = ctx;
    const id = ctx.args[0] ?? '';

    client.output.spinner('Loading deployment');
    const { detail, partial } = await loadDeployment(ctx, id).finally(() => {
      client.output.stopSpinner();
    });

    if (ctx.json) {
      printJson(client, detail);

      return 0;
    }

    const options = detail.deployment_options;
    printDetails(client, [
      ['Deployment', detail.id],
      ['State', formatStatus(detail.state)],
      ['Progress', !TERMINAL.has(detail.state) ? detail.progress?.message : undefined],
      ['Author', formatActor(detail.actor)],
      ['Created', `${formatRelativeTime(detail.created_at)} ${chalk.dim(detail.created_at)}`],
      ['Completed', detail.completed_at ? formatRelativeTime(detail.completed_at) : undefined],
      ['Duration', formatDuration(detail.started_at ?? detail.created_at, detail.completed_at)],
      ['Schema', formatSummary(detail.summary)],
      ['Schema hash', detail.schema_hash],
      [
        'Options',
        options
          ? [options.forceDeploy ? '--force' : '', options.allowBreakingChanges ? '--allow-breaking-changes' : '']
              .filter(Boolean)
              .join(' ')
          : undefined,
      ],
    ]);

    if (detail.error) {
      const { error } = detail;
      const details = error.details ?? [];
      printIssues(
        client,
        `Error${error.stage ? ` (${error.stage})` : ''}`,
        details.length > 0 ? details : [{ code: error.code, message: error.message, hint: error.hint }],
        chalk.red
      );
    }

    printIssues(client, 'Warnings', detail.warnings ?? [], chalk.yellow);
    printStageHistory(client, detail.stage_history ?? []);

    if (ctx.flags['--diff']) {
      if (!detail.snapshot) {
        client.output.warn('The schema snapshots of this deployment are not available to the CLI.');
      } else {
        const diff = diffSchemas(
          toDiffSnapshot(detail.baseline ?? { schema: [], scopes: [], spaces: [], schemaHash: null }),
          toDiffSnapshot(detail.snapshot)
        );
        client.output.print(
          `\n${chalk.bold('Changes')} ${chalk.dim('previous → this deployment')}\n${
            diff.hasChanges ? renderSchemaDiff(diff) : chalk.dim('No schema changes (forced redeploy).')
          }\n`
        );
      }
    }

    if (partial) {
      client.output.dim('Author, stages, warnings and snapshots are not available with these credentials.');
    }

    return 0;
  },
};

interface LogEvent {
  at: string;
  state: string;
  stage?: string;
  message?: string;
}

const logs: Subcommand = {
  command: deploymentsLogsCommand,
  needsProject: true,
  flags: { '--no-follow': Boolean },
  async run(ctx) {
    const { client } = ctx;
    const id = ctx.args[0] ?? '';
    const { detail } = await loadDeployment(ctx, id, 'status');
    const history = detail.stage_history ?? [];
    const events: LogEvent[] = [];
    const print = (entry: { at: string; state: string; stage?: string; message?: string }): void => {
      if (ctx.json) {
        return;
      }

      const time = chalk.dim(new Date(entry.at).toLocaleTimeString());
      const stage = entry.stage ? `${entry.stage} ` : '';
      client.output.print(
        `${time}  ${stage}${formatStatus(entry.state)}${entry.message ? `  ${chalk.dim(entry.message)}` : ''}\n`
      );
    };

    if (history.length > 0) {
      history.forEach(print);
    } else {
      print({ at: detail.created_at, state: detail.state, message: detail.progress?.message });
    }

    let finalState = detail.state;
    let finalError = detail.error;

    if (!TERMINAL.has(finalState) && !ctx.flags['--no-follow']) {
      const response = await client.fetch(`/deploy/jobs/${encodeURIComponent(id)}/events`, {
        projectId: ctx.projectId,
        json: false,
      });
      let lastKey = `${detail.state}|${detail.progress?.message ?? ''}`;

      for await (const event of readEventStream(response)) {
        const payload = parseEventJson<Record<string, unknown>>(event);

        if (event.event === 'error') {
          client.output.error(
            isObject(payload) && typeof payload.message === 'string' ? payload.message : 'Stream error.'
          );

          return 1;
        }

        if (!payload || typeof payload.state !== 'string') {
          continue;
        }

        const job = payload as unknown as DeployJob;
        const key = `${job.state}|${job.progress?.message ?? ''}`;
        finalState = job.state;
        finalError = job.error;

        if (key === lastKey) {
          continue;
        }

        lastKey = key;
        const entry: LogEvent = {
          at: job.timestamps.updatedAt,
          state: job.state,
          stage: job.progress?.stage,
          message: job.progress?.message,
        };
        events.push(entry);
        print(entry);

        if (TERMINAL.has(job.state)) {
          break;
        }
      }
    }

    if (ctx.json) {
      printJson(client, { id: detail.id, state: finalState, stageHistory: history, events, error: finalError });
    } else if (finalState === 'failed') {
      client.output.error(
        `Deployment failed${finalError ? `: ${finalError.message}` : '.'} Run ${getCommandName(`deployments inspect ${id}`)} for details.`
      );
    } else if (finalState === 'completed') {
      client.output.success(`Deployment ${id} completed.`);
    }

    return finalState === 'failed' ? 1 : 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: deploymentsCommand,
    subcommands: [ls, inspect, logs],
    defaultSubcommand: 'ls',
  });
}
