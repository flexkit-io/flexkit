import fs from 'node:fs';
import path from 'node:path';
import { put } from '@vercel/blob';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import chalk from 'chalk';
import type Client from '../../util/client';
import type { JSONObject } from '../../types';
import {
  confirmAction,
  getApiErrorMessage,
  runCommandGroup,
  type Subcommand,
  type SubcommandContext,
} from '../../util/command-group';
import { runWithConcurrency } from '../../util/concurrency';
import { isAPIError } from '../../util/error-utils';
import {
  displayPath,
  formatRelativeTime,
  formatStatus,
  printDetails,
  printJson,
  printTable,
  truncate,
} from '../../util/output/format';
import sleep from '../../util/sleep';
import {
  knowledgeAddCommand,
  knowledgeCommand,
  knowledgeDownloadCommand,
  knowledgeInspectCommand,
  knowledgeLinkCommand,
  knowledgeListCommand,
  knowledgeReingestCommand,
  knowledgeRemoveCommand,
  knowledgeSearchCommand,
  knowledgeUnlinkCommand,
  knowledgeUpdateCommand,
} from './command';
import {
  formatBytes,
  formatLocator,
  isFinishedJobState,
  isUrlInput,
  linkPath,
  parseContentDispositionFilename,
  parseLinkTarget,
  planKnowledgeInputs,
  sanitizeFilename,
  type FileCandidate,
  type KnowledgeInput,
  type KnowledgeJobState,
  type KnowledgeLocator,
} from './files';

interface KnowledgeVersion {
  id: string;
  status: 'processing' | 'published' | 'retired' | 'failed';
  passageCount: number;
  warnings: string[];
  error: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface KnowledgeSource {
  id: string;
  title: string;
  kind: 'upload' | 'url';
  originUrl: string | null;
  mimeType: string;
  path: string | null;
  size: number | null;
  sha256: string | null;
  spaces: string[];
  agentVisible: boolean;
  status: 'processing' | 'ready' | 'failed';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion: KnowledgeVersion | null;
}

interface KnowledgeJob {
  id: string;
  sourceId: string;
  versionId: string;
  state: KnowledgeJobState;
  progress: { phase: KnowledgeJobState; message?: string; passageCount?: number; warnings?: string[] } | null;
  error: { code: string; message: string; hint?: string } | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface SourceListResponse {
  sources: (KnowledgeSource & { preview: string | null; matchedIn: 'title' | 'content' | null })[];
  count: number;
  hasMore: boolean;
}

interface LinksResponse {
  links: { entity: string; entityPlural: string; recordId: string; title: string | null; createdAt: string }[];
  entities: { entity: string; entityPlural: string; createdAt?: string }[];
}

type RegisterResponse =
  | { source: KnowledgeSource; version: KnowledgeVersion; job: KnowledgeJob; duplicate?: undefined }
  | { source: KnowledgeSource; duplicate: true };

interface SearchResponse {
  hits: {
    passageId: string;
    text: string;
    order: number;
    locator: KnowledgeLocator;
    sourceId: string;
    sourceTitle: string;
    versionId: string;
    score: number;
  }[];
  degraded: 'keyword_only' | null;
  scope?: 'record' | 'entity' | 'project' | 'unknown_entity' | null;
}

const POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_SECONDS = 600;

/**
 * Knowledge reads (list, inspect, search, download, job polling) accept a
 * signed-in user only; the platform answers API tokens with this 403.
 */
async function withSessionHint<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err: unknown) {
    if (isAPIError(err) && err.status === 403 && /user session is required/i.test(getApiErrorMessage(err))) {
      throw new Error(
        'Reading knowledge needs a signed-in user: run `flexkit login`. API tokens (FLEXKIT_TOKEN) can add, change and delete documents but not read them.'
      );
    }

    throw err;
  }
}

function sourcePath(sourceId: string, suffix = ''): string {
  return `/knowledge/sources/${encodeURIComponent(sourceId)}${suffix}`;
}

function statusOf(source: KnowledgeSource): string {
  return formatStatus(source.status);
}

function timeoutMs(ctx: SubcommandContext): number {
  const seconds = (ctx.flags['--timeout'] as number | undefined) ?? DEFAULT_TIMEOUT_SECONDS;

  return Math.max(1, seconds) * 1000;
}

/** Polls jobs until each finishes or the timeout passes; returns the last state of each. */
async function waitForJobs(
  ctx: SubcommandContext,
  jobIds: string[],
  timeout: number
): Promise<Map<string, KnowledgeJob>> {
  const latest = new Map<string, KnowledgeJob>();
  const pending = new Set(jobIds);
  const deadline = Date.now() + timeout;

  while (pending.size > 0) {
    ctx.client.output.spinner(
      `Indexing ${String(jobIds.length)} document${jobIds.length === 1 ? '' : 's'} (${String(jobIds.length - pending.size)} done)`
    );

    for (const id of [...pending]) {
      const job = await withSessionHint(() =>
        ctx.client.fetch<KnowledgeJob>(`/knowledge/jobs/${encodeURIComponent(id)}`, { projectId: ctx.projectId })
      );

      latest.set(id, job);

      if (isFinishedJobState(job.state)) {
        pending.delete(id);
      }
    }

    if (pending.size === 0 || Date.now() >= deadline) {
      break;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  ctx.client.output.stopSpinner();

  return latest;
}

function jobDetail(job: KnowledgeJob | undefined): string {
  if (!job) {
    return '';
  }

  if (job.error) {
    return job.error.hint ? `${job.error.message} ${chalk.dim(job.error.hint)}` : job.error.message;
  }

  if (job.state === 'completed' && job.progress?.passageCount !== undefined) {
    return `${String(job.progress.passageCount)} passages`;
  }

  return job.progress?.message ?? '';
}

function jobStatus(state: KnowledgeJobState): string {
  if (state === 'completed') {
    return formatStatus('ready');
  }

  return formatStatus(state === 'extracting' || state === 'embedding' || state === 'publishing' ? 'processing' : state);
}

// ---------------------------------------------------------------------------
// ls / inspect

const ls: Subcommand = {
  command: knowledgeListCommand,
  aliases: ['list'],
  needsProject: true,
  flags: {
    '--search': String,
    '-s': '--search',
    '--status': String,
    '--limit': Number,
    '-n': '--limit',
    '--offset': Number,
  },
  async run(ctx) {
    const params = new URLSearchParams();
    const search = ctx.flags['--search'] as string | undefined;
    const status = ctx.flags['--status'] as string | undefined;
    const offset = ctx.flags['--offset'] as number | undefined;

    if (status && !['processing', 'ready', 'failed'].includes(status)) {
      throw new Error('--status must be processing, ready or failed.');
    }

    for (const [key, value] of [
      ['q', search],
      ['status', status],
      ['limit', ctx.flags['--limit']],
      ['offset', offset],
    ] as const) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }

    const query = params.toString();
    const result = await withSessionHint(() =>
      ctx.client.fetch<SourceListResponse>(`/knowledge/sources${query ? `?${query}` : ''}`, {
        projectId: ctx.projectId,
      })
    );

    if (ctx.json) {
      printJson(ctx.client, result);

      return 0;
    }

    printTable(
      ctx.client,
      ['ID', 'TITLE', 'TYPE', 'STATUS', 'PASSAGES', 'SIZE', 'UPDATED'],
      result.sources.map((source) => [
        chalk.dim(source.id),
        truncate(source.title, 48),
        source.kind === 'url' ? 'web page' : (source.mimeType.split('/').pop() ?? '').replace(/^vnd\..*\./, ''),
        statusOf(source),
        source.currentVersion ? String(source.currentVersion.passageCount) : '',
        formatBytes(source.size),
        formatRelativeTime(source.updatedAt),
      ]),
      search || status ? 'No documents match.' : 'No documents yet. Add one with `flexkit knowledge add <file|url>`.'
    );

    if (result.hasMore) {
      const shown = (offset ?? 0) + result.sources.length;

      ctx.client.output.log(
        chalk.dim(
          `Showing ${String(shown)} of ${String(result.count)}. Use --offset ${String(shown)} for the next page.`
        )
      );
    }

    return 0;
  },
};

const inspect: Subcommand = {
  command: knowledgeInspectCommand,
  aliases: ['get'],
  needsProject: true,
  async run(ctx) {
    const sourceId = ctx.args[0] as string;
    const [detail, links] = await withSessionHint(() =>
      Promise.all([
        ctx.client.fetch<{ source: KnowledgeSource; job: KnowledgeJob | null }>(sourcePath(sourceId), {
          projectId: ctx.projectId,
        }),
        ctx.client.fetch<LinksResponse>(sourcePath(sourceId, '/links'), { projectId: ctx.projectId }),
      ])
    );

    if (ctx.json) {
      printJson(ctx.client, { ...detail, ...links });

      return 0;
    }

    const { source, job } = detail;
    const version = source.currentVersion;

    printDetails(ctx.client, [
      ['ID', source.id],
      ['Title', source.title],
      ['Type', source.kind === 'url' ? `web page (${source.mimeType})` : source.mimeType],
      ['Address', source.originUrl],
      ['Size', formatBytes(source.size)],
      ['Status', statusOf(source)],
      ['Passages', version ? String(version.passageCount) : undefined],
      ['Published', version?.publishedAt ? formatRelativeTime(version.publishedAt) : undefined],
      ['Readable by', source.spaces.length > 0 ? `spaces ${source.spaces.join(', ')}` : 'every project member'],
      ['Agent', source.agentVisible ? 'can search it' : chalk.yellow('hidden from the agent')],
      ['Warnings', version && version.warnings.length > 0 ? version.warnings.join('; ') : undefined],
      ['Error', version?.error ? chalk.red(version.error) : undefined],
      ['Latest job', job ? `${jobStatus(job.state)} ${chalk.dim(job.id)} ${jobDetail(job)}`.trim() : undefined],
      ['Created', formatRelativeTime(source.createdAt)],
      ['Updated', formatRelativeTime(source.updatedAt)],
    ]);

    if (links.entities.length > 0 || links.links.length > 0) {
      printTable(
        ctx.client,
        ['ATTACHED TO', 'RECORD', 'TITLE'],
        [
          ...links.entities.map((entity) => [entity.entity, chalk.dim('every record'), '']),
          ...links.links.map((link) => [link.entity, link.recordId, link.title ?? '']),
        ]
      );
    } else {
      ctx.client.output.log(chalk.dim('Not attached to any record. Attach it with `flexkit knowledge link`.'));
    }

    return 0;
  },
};

// ---------------------------------------------------------------------------
// add

function walkFolder(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFolder(full));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }

  return files;
}

function collectCandidates(client: Client, values: string[]): { files: FileCandidate[]; urls: string[] } {
  const files: FileCandidate[] = [];
  const urls: string[] = [];

  for (const value of values) {
    if (isUrlInput(value)) {
      urls.push(value);
      continue;
    }

    const absolute = path.resolve(client.cwd, value);

    if (!fs.existsSync(absolute)) {
      throw new Error(`Not found: ${value}`);
    }

    const stats = fs.statSync(absolute);
    const toCandidate = (file: string, explicit: boolean): FileCandidate => ({
      path: file,
      label: displayPath(client.cwd, file),
      size: fs.statSync(file).size,
      explicit,
    });

    if (stats.isDirectory()) {
      files.push(...walkFolder(absolute).map((file) => toCandidate(file, false)));
    } else {
      files.push(toCandidate(absolute, true));
    }
  }

  return { files, urls };
}

interface CommonFields {
  title?: string;
  spaces?: string[];
  agentVisible?: boolean;
}

/** Token → direct upload to the file store → registration, as Studio does it. */
async function uploadFile(
  ctx: SubcommandContext,
  input: Extract<KnowledgeInput, { kind: 'file' }>,
  common: CommonFields
): Promise<RegisterResponse> {
  const token = await ctx.client.fetch<{ mediaType: string; pathname: string; token: string }>('/knowledge/uploads', {
    method: 'POST',
    body: { filename: input.filename, mediaType: input.mediaType, sizeBytes: input.size },
    projectId: ctx.projectId,
  });
  const bytes = await fs.promises.readFile(input.path);

  // The upload Studio does, signed with the scoped client token. The server `put` is used because
  // `@vercel/blob/client` refuses to run outside a browser (it checks for `window`).
  await put(token.pathname, bytes, {
    access: 'public',
    contentType: token.mediaType,
    token: token.token,
  });

  return ctx.client.fetch<RegisterResponse>('/knowledge/sources', {
    method: 'POST',
    body: { kind: 'upload', pathname: token.pathname, ...common },
    projectId: ctx.projectId,
  });
}

function registerUrl(ctx: SubcommandContext, url: string, common: CommonFields): Promise<RegisterResponse> {
  return ctx.client.fetch<RegisterResponse>('/knowledge/sources', {
    method: 'POST',
    body: { kind: 'url', url, ...common },
    projectId: ctx.projectId,
  });
}

interface AddResult {
  input: string;
  source?: KnowledgeSource;
  job?: KnowledgeJob;
  duplicate?: boolean;
  links?: { entity: string; recordId?: string; linked?: boolean; error?: string }[];
  error?: string;
}

function readSpaces(ctx: SubcommandContext): string[] | undefined {
  const spaces = (ctx.flags['--space'] as string[] | undefined)?.map((code) => code.trim()).filter(Boolean);

  return spaces && spaces.length > 0 ? spaces : undefined;
}

const add: Subcommand = {
  command: knowledgeAddCommand,
  aliases: ['upload'],
  needsProject: true,
  flags: {
    '--title': String,
    '--space': [String] as [StringConstructor],
    '--hide-from-agent': Boolean,
    '--link': [String] as [StringConstructor],
    '-l': '--link',
    '--concurrency': Number,
    '-c': '--concurrency',
    '--wait': Boolean,
    '--timeout': Number,
  },
  async run(ctx) {
    const { output } = ctx.client;
    const links = ((ctx.flags['--link'] as string[] | undefined) ?? []).map(parseLinkTarget);
    const { files, urls } = collectCandidates(ctx.client, ctx.args);
    const plan = planKnowledgeInputs(files, urls);
    const title = (ctx.flags['--title'] as string | undefined)?.trim();

    if (title && plan.inputs.length !== 1) {
      throw new Error('--title applies to a single document; pass one file or URL.');
    }

    const common: CommonFields = {
      ...(title ? { title } : {}),
      ...(readSpaces(ctx) ? { spaces: readSpaces(ctx) } : {}),
      ...(ctx.flags['--hide-from-agent'] ? { agentVisible: false } : {}),
    };

    const explicitSkips = plan.skipped.filter((skip) => skip.explicit);
    const folderSkips = plan.skipped.length - explicitSkips.length;

    for (const skip of explicitSkips) {
      output.warn(`Skipping ${skip.label}: ${skip.reason}.`);
    }

    if (folderSkips > 0) {
      output.warn(
        `Skipping ${String(folderSkips)} file${folderSkips === 1 ? '' : 's'} in the folder${folderSkips === 1 ? '' : 's'} (unsupported type, empty or over 20 MB). Use --debug to list them.`
      );

      for (const skip of plan.skipped.filter((entry) => !entry.explicit)) {
        output.debug(`skipped ${skip.label}: ${skip.reason}`);
      }
    }

    if (plan.inputs.length === 0) {
      throw new Error('Nothing to add.');
    }

    const concurrency = Math.max(1, Math.min((ctx.flags['--concurrency'] as number | undefined) ?? 3, 10));
    const adding = `Adding ${String(plan.inputs.length)} document${plan.inputs.length === 1 ? '' : 's'}`;
    let done = 0;

    output.spinner(adding);

    const addInput = async (input: (typeof plan.inputs)[number]): Promise<AddResult> => {
      const registered =
        input.kind === 'file' ? await uploadFile(ctx, input, common) : await registerUrl(ctx, input.url, common);
      const result: AddResult = {
        input: input.label,
        source: registered.source,
        job: registered.duplicate ? undefined : registered.job,
        duplicate: Boolean(registered.duplicate),
      };

      if (links.length > 0) {
        result.links = [];

        for (const link of links) {
          try {
            const { linked } = await ctx.client.fetch<{ linked: boolean }>(sourcePath(registered.source.id, '/links'), {
              method: 'POST',
              body: link.recordId ? { entity: link.entity, recordId: link.recordId } : { entity: link.entity },
              projectId: ctx.projectId,
            });

            result.links.push({ ...link, linked });
          } catch (err: unknown) {
            result.links.push({ ...link, error: getApiErrorMessage(err) });
          }
        }
      }

      return result;
    };

    const settled = await runWithConcurrency(plan.inputs, concurrency, async (input) => {
      // Count every finished input, failed ones too, so the counter reaches the total.
      try {
        return await addInput(input);
      } finally {
        done += 1;
        output.spinner(`${adding} (${String(done)} done)`);
      }
    });

    output.stopSpinner();

    const results: AddResult[] = settled.map(
      ({ item, result, error }) =>
        result ?? { input: item.label, error: error ? getApiErrorMessage(error) : 'Unknown error' }
    );

    if (ctx.flags['--wait']) {
      const jobIds = results.flatMap((result) => (result.job ? [result.job.id] : []));

      if (jobIds.length > 0) {
        const jobs = await waitForJobs(ctx, jobIds, timeoutMs(ctx));

        for (const result of results) {
          if (result.job) {
            result.job = jobs.get(result.job.id) ?? result.job;
          }
        }
      }
    }

    const failed = results.filter(
      (result) =>
        result.error ||
        result.job?.state === 'failed' ||
        result.job?.state === 'cancelled' ||
        result.links?.some((link) => link.error)
    );

    if (ctx.json) {
      printJson(ctx.client, { results, skipped: plan.skipped.map(({ label, reason }) => ({ input: label, reason })) });

      return failed.length > 0 ? 1 : 0;
    }

    printTable(
      ctx.client,
      ['INPUT', 'DOCUMENT ID', 'STATUS', 'DETAIL'],
      results.map((result) => {
        if (result.error) {
          return [truncate(result.input, 50), '', formatStatus('failed'), result.error];
        }

        const linkErrors =
          result.links?.filter((link) => link.error).map((link) => `link ${link.entity}: ${link.error ?? ''}`) ?? [];
        const status = result.duplicate ? chalk.dim('already added') : result.job ? jobStatus(result.job.state) : '';

        return [
          truncate(result.input, 50),
          chalk.dim(result.source?.id ?? ''),
          status,
          [jobDetail(result.job), ...linkErrors].filter(Boolean).join('; '),
        ];
      })
    );

    const added = results.length - failed.length;

    if (failed.length === 0) {
      output.success(
        `Added ${String(added)} document${added === 1 ? '' : 's'}${ctx.flags['--wait'] ? '' : '; indexing continues in the background (use --wait to follow it)'}.`
      );
    } else {
      output.error(`${String(failed.length)} of ${String(results.length)} failed.`);
    }

    return failed.length > 0 ? 1 : 0;
  },
};

// ---------------------------------------------------------------------------
// update / rm / reingest

const update: Subcommand = {
  command: knowledgeUpdateCommand,
  needsProject: true,
  flags: {
    '--title': String,
    '--space': [String] as [StringConstructor],
    '--all-members': Boolean,
    '--hide-from-agent': Boolean,
    '--show-to-agent': Boolean,
  },
  async run(ctx) {
    const body: CommonFields = {};
    const title = (ctx.flags['--title'] as string | undefined)?.trim();
    const spaces = readSpaces(ctx);

    if (title) {
      body.title = title;
    }

    if (spaces && ctx.flags['--all-members']) {
      throw new Error('Pass either --space or --all-members.');
    }

    if (spaces) {
      body.spaces = spaces;
    } else if (ctx.flags['--all-members']) {
      body.spaces = [];
    }

    if (ctx.flags['--hide-from-agent'] && ctx.flags['--show-to-agent']) {
      throw new Error('Pass either --hide-from-agent or --show-to-agent.');
    }

    if (ctx.flags['--hide-from-agent']) {
      body.agentVisible = false;
    } else if (ctx.flags['--show-to-agent']) {
      body.agentVisible = true;
    }

    if (Object.keys(body).length === 0) {
      throw new Error('Nothing to change. Pass --title, --space, --all-members, --hide-from-agent or --show-to-agent.');
    }

    const { source } = await ctx.client.fetch<{ source: KnowledgeSource }>(sourcePath(ctx.args[0] as string), {
      method: 'PATCH',
      body: { ...body },
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, { source });

      return 0;
    }

    ctx.client.output.success(`Updated ${chalk.bold(source.title)} ${chalk.dim(`(${source.id})`)}`);

    return 0;
  },
};

const rm: Subcommand = {
  command: knowledgeRemoveCommand,
  aliases: ['remove'],
  needsProject: true,
  async run(ctx) {
    const ids = [...new Set(ctx.args)];
    const label = ids.length === 1 ? `the document ${ids[0] ?? ''}` : `${String(ids.length)} documents`;

    if (!(await confirmAction(ctx, `Delete ${label} and everything indexed from it?`))) {
      return 1;
    }

    const results: { id: string; deleted: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        await ctx.client.fetch<{ deleted: true }>(sourcePath(id), { method: 'DELETE', projectId: ctx.projectId });
        results.push({ id, deleted: true });

        if (!ctx.json) {
          ctx.client.output.success(`Deleted ${chalk.dim(id)}`);
        }
      } catch (err: unknown) {
        results.push({ id, deleted: false, error: getApiErrorMessage(err) });

        if (!ctx.json) {
          ctx.client.output.error(`${id}: ${getApiErrorMessage(err)}`);
        }
      }
    }

    if (ctx.json) {
      printJson(ctx.client, results);
    }

    return results.every((result) => result.deleted) ? 0 : 1;
  },
};

const reingest: Subcommand = {
  command: knowledgeReingestCommand,
  needsProject: true,
  flags: { '--wait': Boolean, '--timeout': Number },
  async run(ctx) {
    const sourceId = ctx.args[0] as string;
    const started = await ctx.client.fetch<{ version: KnowledgeVersion; job: KnowledgeJob }>(
      sourcePath(sourceId, '/reingest'),
      { method: 'POST', projectId: ctx.projectId }
    );
    let { job } = started;

    if (ctx.flags['--wait']) {
      job = (await waitForJobs(ctx, [job.id], timeoutMs(ctx))).get(job.id) ?? job;
    }

    if (ctx.json) {
      printJson(ctx.client, { ...started, job });

      return job.state === 'failed' || job.state === 'cancelled' ? 1 : 0;
    }

    if (job.state === 'completed') {
      ctx.client.output.success(`Re-indexed ${chalk.dim(sourceId)}: ${jobDetail(job)}`);
    } else if (job.state === 'failed' || job.state === 'cancelled') {
      ctx.client.output.error(`Re-indexing ${sourceId} ${job.state}: ${jobDetail(job)}`);

      return 1;
    } else {
      ctx.client.output.success(
        `Re-indexing ${chalk.dim(sourceId)} (job ${job.id}, ${job.state}). The current version stays searchable until it finishes.`
      );
    }

    return 0;
  },
};

// ---------------------------------------------------------------------------
// download

const download: Subcommand = {
  command: knowledgeDownloadCommand,
  needsProject: true,
  flags: { '--force': Boolean, '-f': '--force' },
  async run(ctx) {
    const [sourceId, dest] = ctx.args as [string, string | undefined];
    const response = await withSessionHint(() =>
      ctx.client.fetch(sourcePath(sourceId, '/file'), { projectId: ctx.projectId, json: false })
    );

    if (!response.body) {
      throw new Error('The file is empty.');
    }

    const body = Readable.fromWeb(response.body as unknown as WebReadableStream);

    if (dest === '-') {
      await pipeline(body, ctx.client.stdout);

      return 0;
    }

    const filename =
      parseContentDispositionFilename(response.headers.get('content-disposition')) ??
      sanitizeFilename(sourceId) ??
      'document';
    let target = path.resolve(ctx.client.cwd, dest ?? filename);

    if (dest && (/[/\\]$/.test(dest) || (fs.existsSync(target) && fs.statSync(target).isDirectory()))) {
      fs.mkdirSync(target, { recursive: true });
      target = path.join(target, filename);
    }

    if (fs.existsSync(target) && !ctx.flags['--force']) {
      body.destroy();
      throw new Error(`${displayPath(ctx.client.cwd, target)} already exists. Pass --force to overwrite it.`);
    }

    await pipeline(body, fs.createWriteStream(target));
    ctx.client.output.success(
      `Saved ${displayPath(ctx.client.cwd, target)} (${formatBytes(fs.statSync(target).size)})`
    );

    return 0;
  },
};

// ---------------------------------------------------------------------------
// search

const search: Subcommand = {
  command: knowledgeSearchCommand,
  needsProject: true,
  flags: {
    '--limit': Number,
    '-n': '--limit',
    '--source': [String] as [StringConstructor],
    '--about': String,
  },
  async run(ctx) {
    const query = ctx.args.join(' ').trim();
    const sourceIds = ctx.flags['--source'] as string[] | undefined;
    const about = ctx.flags['--about'] ? parseLinkTarget(ctx.flags['--about'] as string) : undefined;
    const body: JSONObject = { query };

    if (ctx.flags['--limit'] !== undefined) {
      body.first = ctx.flags['--limit'] as number;
    }

    if (sourceIds && sourceIds.length > 0) {
      body.sourceIds = sourceIds;
    }

    if (about) {
      body.about = { ...about };
    }

    const result = await withSessionHint(() =>
      ctx.client.fetch<SearchResponse>('/knowledge/search', {
        method: 'POST',
        body,
        projectId: ctx.projectId,
      })
    );

    if (ctx.json) {
      printJson(ctx.client, result);

      return 0;
    }

    const { output } = ctx.client;

    if (result.degraded === 'keyword_only') {
      output.warn('Semantic search is unavailable right now; these results come from keyword matching only.');
    }

    if (about && result.scope === 'unknown_entity') {
      output.warn(`"${about.entity}" is not a deployed entity you can read, so the whole project was searched.`);
    } else if (about && result.scope === 'project') {
      output.log(chalk.dim('No documents are attached there, so the whole project was searched.'));
    }

    if (result.hits.length === 0) {
      output.log('No passages match.');

      return 0;
    }

    const width = Math.max(40, Math.min(ctx.client.stderr.columns || 100, 120) - 4);

    result.hits.forEach((hit, index) => {
      const where = formatLocator(hit.locator);
      const header = `${chalk.bold(`${String(index + 1)}. ${hit.sourceTitle || hit.sourceId}`)}${where ? chalk.dim(` · ${where}`) : ''}`;
      const text = wrap(hit.text.trim(), width)
        .map((line) => `   ${line}`)
        .join('\n');

      output.print(`${header}\n${chalk.dim(`   ${hit.sourceId}`)}\n${text}\n\n`);
    });

    return 0;
  },
};

/** Soft-wraps text at word boundaries, keeping its own line breaks. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    let line = '';

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > width) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }

    lines.push(line);
  }

  return lines;
}

// ---------------------------------------------------------------------------
// link / unlink

const link: Subcommand = {
  command: knowledgeLinkCommand,
  needsProject: true,
  async run(ctx) {
    const [sourceId, entity, recordId] = ctx.args as [string, string, string | undefined];
    const result = await ctx.client.fetch<{ linked: boolean }>(sourcePath(sourceId, '/links'), {
      method: 'POST',
      body: recordId ? { entity, recordId } : { entity },
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, result);

      return 0;
    }

    const target = recordId ? `${entity} ${recordId}` : `every ${entity}`;

    if (result.linked) {
      ctx.client.output.success(`Attached ${chalk.dim(sourceId)} to ${target}`);
    } else {
      ctx.client.output.log(`${sourceId} was already attached to ${target}.`);
    }

    return 0;
  },
};

const unlink: Subcommand = {
  command: knowledgeUnlinkCommand,
  needsProject: true,
  async run(ctx) {
    const [sourceId, entity, recordId] = ctx.args as [string, string, string | undefined];
    const result = await ctx.client.fetch<{ unlinked: boolean }>(linkPath(sourceId, entity, recordId), {
      method: 'DELETE',
      projectId: ctx.projectId,
    });

    if (ctx.json) {
      printJson(ctx.client, result);

      return 0;
    }

    const target = recordId ? `${entity} ${recordId}` : `the ${entity} entity type`;

    if (result.unlinked) {
      ctx.client.output.success(`Detached ${chalk.dim(sourceId)} from ${target}`);
    } else {
      ctx.client.output.log(`${sourceId} was not attached to ${target}.`);
    }

    return 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: knowledgeCommand,
    subcommands: [ls, inspect, add, update, rm, reingest, download, search, link, unlink],
    defaultSubcommand: 'ls',
  });
}
