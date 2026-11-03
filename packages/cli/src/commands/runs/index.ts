import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import chalk from 'chalk';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand } from '../../util/command-group';
import { formatRelativeTime, printJson, printTable } from '../../util/output/format';
import humanizePath from '../../util/humanize-path';
import type { AutomationRun, AutomationRunStatus, RunArtifact, RunHistory } from '../automations/types';
import {
  runsArtifactsCommand,
  runsCancelCommand,
  runsCommand,
  runsInspectCommand,
  runsListCommand,
  runsLogsCommand,
  runsTranscriptCommand,
} from './command';
import { formatBytes, printRunDetails, printRunOutcome, runTableRow } from './format';
import { getRun, streamRun } from './stream';
import { renderTranscript } from './transcript';

const ACTIVE_STATUSES: AutomationRunStatus[] = ['running', 'awaiting_approval'];

/** Clamps `--limit`/`--offset` values to what the API accepts. */
export function pageParams(flags: Record<string, unknown>, defaultLimit: number): { limit: number; offset: number } {
  const rawLimit = flags['--limit'] as number | undefined;
  const rawOffset = flags['--offset'] as number | undefined;
  const limit =
    Number.isFinite(rawLimit) && (rawLimit as number) > 0
      ? Math.min(Math.floor(rawLimit as number), 100)
      : defaultLimit;
  const offset = Number.isFinite(rawOffset) && (rawOffset as number) > 0 ? Math.floor(rawOffset as number) : 0;

  return { limit, offset };
}

/** Builds the list path: one automation's runs, or the project's run history. */
export function runsListPath({
  automationId,
  limit,
  mine,
  offset,
}: {
  automationId?: string;
  limit: number;
  mine: boolean;
  offset: number;
}): string {
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });

  if (automationId) {
    return `/automations/${encodeURIComponent(automationId)}/runs?${params.toString()}`;
  }

  params.set('scope', mine ? 'mine' : 'team');

  return `/automations/runs?${params.toString()}`;
}

/** A file name inside `dir` that does not overwrite an existing file: `report.pdf`, `report (1).pdf`, … */
export function uniqueFilePath(
  dir: string,
  filename: string,
  exists: (file: string) => boolean = fs.existsSync
): string {
  const safe = path.basename(filename).replace(/[\0/\\]/g, '_') || 'artifact';
  const ext = path.extname(safe);
  const stem = safe.slice(0, safe.length - ext.length);
  let candidate = path.join(dir, safe);

  for (let index = 1; exists(candidate); index += 1) {
    candidate = path.join(dir, `${stem} (${index.toString()})${ext}`);
  }

  return candidate;
}

function runPath(runId: string, suffix = ''): string {
  return `/automations/runs/${encodeURIComponent(runId)}${suffix}`;
}

const ls: Subcommand = {
  command: runsListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: {
    '--automation': String,
    '-a': '--automation',
    '--mine': Boolean,
    '--limit': Number,
    '-n': '--limit',
    '--offset': Number,
  },
  async run(ctx) {
    const { client, flags, projectId } = ctx;
    const { limit, offset } = pageParams(flags, 20);
    const automationId = flags['--automation'] as string | undefined;
    const listPath = runsListPath({ automationId, limit, mine: Boolean(flags['--mine']), offset });

    client.output.spinner('Loading runs');

    if (automationId) {
      const res = await client.fetch<{ hasMore: boolean; runs: AutomationRun[] }>(listPath, { projectId });
      client.output.stopSpinner();

      if (ctx.json) {
        printJson(client, res);

        return 0;
      }

      printTable(
        client,
        ['ID', 'STATUS', 'TRIGGER', 'STARTED', 'DURATION'],
        res.runs.map((run) => runTableRow(run, false)),
        'This automation has no runs yet, or you cannot see it.'
      );
      printMore(client, res.hasMore, offset + limit);

      return 0;
    }

    const { history } = await client.fetch<{ history: RunHistory }>(listPath, { projectId });
    client.output.stopSpinner();

    if (ctx.json) {
      printJson(client, history);

      return 0;
    }

    printTable(
      client,
      ['ID', 'AUTOMATION', 'STATUS', 'TRIGGER', 'STARTED', 'DURATION'],
      history.runs.map((run) => runTableRow(run, true)),
      'No runs yet.'
    );
    const { metrics } = history;
    client.output.dim(
      `Last 24h: ${metrics.successful24h.toString()} succeeded, ${metrics.failed24h.toString()} failed · last 7d: ${metrics.successful7d.toString()} succeeded, ${metrics.failed7d.toString()} failed`
    );
    printMore(client, history.hasMore, offset + limit);

    return 0;
  },
};

function printMore(client: Client, hasMore: boolean, nextOffset: number): void {
  if (hasMore) {
    client.output.dim(`More runs available: pass --offset ${nextOffset.toString()}.`);
  }
}

const inspect: Subcommand = {
  command: runsInspectCommand,
  aliases: ['get'],
  needsProject: true,
  async run(ctx) {
    const { client, projectId } = ctx;
    const res = await client.fetch<{ run: AutomationRun }>(runPath(ctx.args[0] as string), { projectId });

    if (ctx.json) {
      printJson(client, res);

      return 0;
    }

    printRunDetails(client, res.run);

    return 0;
  },
};

const logs: Subcommand = {
  command: runsLogsCommand,
  needsProject: true,
  flags: { '--follow': Boolean, '-f': '--follow' },
  async run(ctx) {
    const { client, projectId } = ctx;
    const run = await getRun(client, projectId, ctx.args[0] as string);
    const follow = Boolean(ctx.flags['--follow']);
    const final = await streamRun(client, projectId, run, { follow, json: ctx.json });

    if (!ctx.json && (follow || ACTIVE_STATUSES.includes(final.status))) {
      printRunOutcome(client, final);
    }

    return 0;
  },
};

const transcript: Subcommand = {
  command: runsTranscriptCommand,
  needsProject: true,
  flags: { '--output': String, '-o': '--output' },
  async run(ctx) {
    const { client, projectId } = ctx;
    const runId = ctx.args[0] as string;
    const res = await client.fetch<{ transcript: unknown[] | null }>(runPath(runId, '/transcript'), { projectId });
    const outputFile = ctx.flags['--output'] as string | undefined;

    if (outputFile) {
      const target = path.resolve(client.cwd, outputFile);
      fs.writeFileSync(target, `${JSON.stringify(res.transcript ?? [], null, 2)}\n`);
      client.output.success(`Saved the transcript of run ${runId} to ${humanizePath(target)}.`);

      return 0;
    }

    if (ctx.json) {
      printJson(client, res);

      return 0;
    }

    if (!res.transcript || res.transcript.length === 0) {
      client.output.log('This run has no stored transcript (it is still running, or it was skipped).');

      return 0;
    }

    client.stdout.write(renderTranscript(res.transcript));

    return 0;
  },
};

async function downloadArtifact(
  client: Client,
  projectId: string,
  artifact: RunArtifact,
  dir: string
): Promise<string> {
  const response = await client.fetch(
    `/automations/artifacts/${encodeURIComponent(artifact.artifactId)}/content?download=1`,
    { projectId, json: false }
  );

  if (!response.body) {
    throw new Error(`The content of ${artifact.filename} is empty.`);
  }

  const target = uniqueFilePath(dir, artifact.filename);
  await pipeline(Readable.fromWeb(response.body as unknown as WebReadableStream), fs.createWriteStream(target));

  return target;
}

const artifacts: Subcommand = {
  command: runsArtifactsCommand,
  needsProject: true,
  flags: { '--download': Boolean, '--out-dir': String, '-o': '--out-dir' },
  async run(ctx) {
    const { client, projectId } = ctx;
    const [runId, artifactId] = ctx.args as [string, string | undefined];
    const run = await getRun(client, projectId, runId);

    if (!run.workflowRunId) {
      if (ctx.json) {
        printJson(client, { artifacts: [] });
      } else {
        client.output.log('This run generated no files.');
      }

      return 0;
    }

    const res = await client.fetch<{ artifacts: RunArtifact[] }>(runPath(run.workflowRunId, '/artifacts'), {
      projectId,
    });
    const selected = artifactId
      ? res.artifacts.filter((artifact) => artifact.artifactId === artifactId)
      : res.artifacts;

    if (artifactId && selected.length === 0) {
      client.output.error(`Run ${runId} has no artifact ${artifactId}.`);

      return 1;
    }

    if (!ctx.flags['--download']) {
      if (ctx.json) {
        printJson(client, { artifacts: selected });

        return 0;
      }

      printTable(
        client,
        ['ID', 'FILE', 'KIND', 'SIZE', 'CREATED'],
        selected.map((artifact) => [
          artifact.artifactId,
          artifact.filename,
          artifact.kind,
          formatBytes(artifact.sizeBytes),
          formatRelativeTime(artifact.createdAt),
        ]),
        'This run generated no files.'
      );

      return 0;
    }

    const dir = path.resolve(client.cwd, (ctx.flags['--out-dir'] as string | undefined) ?? '.');
    fs.mkdirSync(dir, { recursive: true });
    const saved: { artifactId: string; filename: string; path: string }[] = [];

    for (const artifact of selected) {
      client.output.spinner(`Downloading ${artifact.filename}`);
      const target = await downloadArtifact(client, projectId, artifact, dir);
      client.output.stopSpinner();
      saved.push({ artifactId: artifact.artifactId, filename: artifact.filename, path: target });

      if (!ctx.json) {
        client.output.success(`Saved ${artifact.filename} to ${humanizePath(target)}.`);
      }
    }

    if (ctx.json) {
      printJson(client, { downloaded: saved });
    } else if (saved.length === 0) {
      client.output.log('This run generated no files.');
    }

    return 0;
  },
};

const cancel: Subcommand = {
  command: runsCancelCommand,
  needsProject: true,
  async run(ctx) {
    const { client, projectId } = ctx;
    const runId = ctx.args[0] as string;

    if (!(await confirmAction(ctx, `Cancel run ${runId}?`))) {
      return 1;
    }

    const res = await client.fetch<{ success: boolean; errorMessage?: string }>(runPath(runId, '/cancel'), {
      method: 'POST',
      projectId,
    });

    if (ctx.json) {
      printJson(client, res);

      return 0;
    }

    client.output.success(`Cancelled run ${chalk.bold(runId)}.`);

    return 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: runsCommand,
    subcommands: [ls, inspect, logs, transcript, artifacts, cancel],
    defaultSubcommand: 'ls',
  });
}
