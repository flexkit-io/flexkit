import { handleError } from '../../util/handle-error';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import sleep from '../../util/sleep';
import { getCommandName } from '../../util/pkg';
import { errorToString, isAPIError, isObject } from '../../util/error-utils';
import { help } from '../help';
import { deployCommand } from './command';

type DeployState = 'queued' | 'validating' | 'building' | 'uploading' | 'activating' | 'completed' | 'failed';

interface DeployObserve {
  poll: string;
  sse: string;
}

interface DeployStartResponse {
  jobId: string;
  state: DeployState;
  observe: DeployObserve;
}

interface DeployNoChangesResponse {
  message: string;
  hasChanges: false;
  schemaHash: string;
}

interface DeployJobResponse {
  jobId?: string;
  state: DeployState;
  progress?: unknown;
  error?: unknown;
}

interface DeployFailureDetail {
  code?: string;
  path?: string;
  message: string;
  hint?: string;
}

interface DeployProjectJob {
  hasChanges: true;
  jobId: string;
  state: DeployState;
  observe: DeployObserve;
}

interface DeployProjectNoChanges {
  hasChanges: false;
  message: string;
  schemaHash: string;
}

type DeployProjectResult = DeployProjectJob | DeployProjectNoChanges;

interface ProgressContext {
  lastProgress?: string;
}

const DEPLOY_STATES: DeployState[] = [
  'queued',
  'validating',
  'building',
  'uploading',
  'activating',
  'completed',
  'failed',
];
const TERMINAL_STATES: DeployState[] = ['completed', 'failed'];
const POLL_INTERVAL_MS = 1500;
const SSE_CONNECT_TIMEOUT_MS = 8000;
const MAX_OBSERVE_RETRIES = 5;

function isDeployState(value: unknown): value is DeployState {
  return typeof value === 'string' && DEPLOY_STATES.includes(value as DeployState);
}

function isDeployNoChangesResponse(response: unknown): response is DeployNoChangesResponse {
  return (
    isObject(response) &&
    response.hasChanges === false &&
    typeof response.message === 'string' &&
    typeof response.schemaHash === 'string'
  );
}

function isTerminalState(state: DeployState): boolean {
  return TERMINAL_STATES.includes(state);
}

function getDefaultObserve(jobId: string): DeployObserve {
  const encodedId = encodeURIComponent(jobId);

  return {
    poll: `/deploy/jobs/${encodedId}`,
    sse: `/deploy/jobs/${encodedId}/events`,
  };
}

function renderStateTransition(
  output: Client['output'],
  projectId: string,
  state: DeployState,
  seenStates: Set<DeployState>
): void {
  if (seenStates.has(state)) {
    return;
  }

  seenStates.add(state);
  output.log(`[${projectId}] ${state}`);
}

function resolveProgressMessage(progress: unknown): string | undefined {
  if (typeof progress === 'string' && progress.trim().length > 0) {
    return progress.trim();
  }

  if (typeof progress === 'number') {
    return `${progress.toString()}%`;
  }

  if (!isObject(progress)) {
    return undefined;
  }

  if (typeof progress.message === 'string' && progress.message.trim().length > 0) {
    return progress.message.trim();
  }

  if (typeof progress.percent === 'number') {
    return `${progress.percent.toString()}%`;
  }

  return undefined;
}

function extractFailureDetails(error: unknown): DeployFailureDetail[] {
  if (Array.isArray(error)) {
    return error.flatMap((entry) => extractFailureDetails(entry));
  }

  if (typeof error === 'string') {
    return [{ message: error }];
  }

  if (!isObject(error)) {
    return [{ message: 'Deploy failed with an unknown error.' }];
  }

  const nestedErrors = Array.isArray(error.errors) ? error.errors : undefined;

  if (nestedErrors && nestedErrors.length > 0) {
    const flattened = nestedErrors.flatMap((entry) => extractFailureDetails(entry));

    if (flattened.length > 0) {
      return flattened;
    }
  }

  const message =
    typeof error.message === 'string' && error.message.trim().length > 0 ? error.message : 'Deploy failed.';
  const detail: DeployFailureDetail = { message };

  if (typeof error.code === 'string' && error.code.length > 0) {
    detail.code = error.code;
  }

  if (typeof error.path === 'string' && error.path.length > 0) {
    detail.path = error.path;
  }

  if (typeof error.hint === 'string' && error.hint.length > 0) {
    detail.hint = error.hint;
  }

  return [detail];
}

function renderFailureDetails(output: Client['output'], projectId: string, details: DeployFailureDetail[]): void {
  for (const detail of details) {
    const code = detail.code ?? 'unknown';
    const path = detail.path ?? '-';
    const hint = detail.hint ? ` hint=${detail.hint}` : '';

    output.error(`[${projectId}] code=${code} path=${path} message=${detail.message}${hint}`);
  }
}

function applyJobUpdate(
  output: Client['output'],
  projectId: string,
  status: DeployJobResponse,
  seenStates: Set<DeployState>,
  progressContext: ProgressContext
): void {
  renderStateTransition(output, projectId, status.state, seenStates);

  const message = resolveProgressMessage(status.progress);

  if (!message || progressContext.lastProgress === message) {
    return;
  }

  progressContext.lastProgress = message;
  output.dim(`[${projectId}] ${message}`);
}

function formatProjectLabel(projectIds: string[]): { projectsLabel: string; projectWord: string } {
  const projectsLabel = projectIds.length === 1 ? projectIds[0]! : projectIds.join(', ');
  const projectWord = projectIds.length === 1 ? 'project' : 'projects';

  return { projectsLabel, projectWord };
}

async function startDeployJob(
  client: Client,
  projectId: string,
  schema: unknown,
  scopes: unknown
): Promise<DeployProjectResult> {
  try {
    const response = await client.fetch('/deploy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schema,
        scopes,
      }),
      projectId,
      retry: {
        retries: 3,
      },
    });

    if (isDeployNoChangesResponse(response)) {
      return {
        hasChanges: false,
        message: response.message,
        schemaHash: response.schemaHash,
      };
    }

    const deployResponse = response as DeployStartResponse;

    return {
      hasChanges: true,
      jobId: deployResponse.jobId,
      state: deployResponse.state,
      observe: getDefaultObserve(deployResponse.jobId),
    };
  } catch (err: unknown) {
    if (isAPIError(err) && err.status === 409 && typeof err.jobId === 'string') {
      const state = isDeployState(err.state) ? err.state : 'queued';
      const observe = getDefaultObserve(err.jobId);
      client.output.warn(`[${projectId}] Another deploy is already running. Attaching to job ${err.jobId}.`);

      return {
        hasChanges: true,
        jobId: err.jobId,
        state,
        observe,
      };
    }

    throw err;
  }
}

function parseSsePayload(block: string): DeployJobResponse | null {
  const lines = block.split(/\r?\n/);
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line.startsWith('data:')) {
      continue;
    }

    dataLines.push(line.slice(5).trim());
  }

  if (dataLines.length === 0) {
    return null;
  }

  const payload = dataLines.join('\n');

  if (payload.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;

    if (!isObject(parsed) || !isDeployState(parsed.state)) {
      return null;
    }

    const status: DeployJobResponse = {
      state: parsed.state,
      progress: parsed.progress,
      error: parsed.error,
    };

    if (typeof parsed.jobId === 'string') {
      status.jobId = parsed.jobId;
    }

    return status;
  } catch {
    return null;
  }
}

async function observeJobViaSse(
  client: Client,
  projectId: string,
  observe: DeployObserve,
  seenStates: Set<DeployState>,
  progressContext: ProgressContext,
  isCancelled: () => boolean
): Promise<DeployJobResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, SSE_CONNECT_TIMEOUT_MS);

  let response: Response;

  try {
    response = (await client.fetch(observe.sse, {
      json: false,
      projectId,
      signal: controller.signal,
      retry: {
        retries: 2,
      },
    })) as Response;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.body) {
    throw new Error('SSE stream is unavailable.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (isCancelled()) {
      throw new Error('Deploy observation was canceled.');
    }

    const chunk = await reader.read();

    if (chunk.done) {
      throw new Error('SSE stream ended before deploy completed.');
    }

    buffer += decoder.decode(chunk.value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const status = parseSsePayload(event);

      if (!status) {
        continue;
      }

      applyJobUpdate(client.output, projectId, status, seenStates, progressContext);

      if (!isTerminalState(status.state)) {
        continue;
      }

      return status;
    }
  }
}

async function observeJobViaPolling(
  client: Client,
  projectId: string,
  observe: DeployObserve,
  seenStates: Set<DeployState>,
  progressContext: ProgressContext,
  isCancelled: () => boolean
): Promise<DeployJobResponse> {
  let retries = 0;

  while (true) {
    if (isCancelled()) {
      throw new Error('Deploy observation was canceled.');
    }

    try {
      const status = await client.fetch<DeployJobResponse>(observe.poll, {
        projectId,
        retry: {
          retries: 3,
        },
      });

      applyJobUpdate(client.output, projectId, status, seenStates, progressContext);

      if (isTerminalState(status.state)) {
        return status;
      }

      retries = 0;
      await sleep(POLL_INTERVAL_MS);
      continue;
    } catch (err: unknown) {
      retries += 1;

      if (retries > MAX_OBSERVE_RETRIES) {
        throw err;
      }

      const backoff = Math.min(POLL_INTERVAL_MS * retries, 5000);
      client.output.debug(`[${projectId}] polling retry in ${backoff.toString()}ms: ${errorToString(err)}`);
      await sleep(backoff);
    }
  }
}

async function observeDeployJob(
  client: Client,
  projectId: string,
  observe: DeployObserve,
  initialState: DeployState,
  isCancelled: () => boolean
): Promise<DeployJobResponse> {
  const seenStates = new Set<DeployState>();
  const progressContext: ProgressContext = {};

  applyJobUpdate(client.output, projectId, { state: initialState }, seenStates, progressContext);

  if (isTerminalState(initialState)) {
    return { state: initialState };
  }

  try {
    return await observeJobViaSse(client, projectId, observe, seenStates, progressContext, isCancelled);
  } catch (err: unknown) {
    client.output.debug(`[${projectId}] SSE observation unavailable, falling back to polling: ${errorToString(err)}`);
    return observeJobViaPolling(client, projectId, observe, seenStates, progressContext, isCancelled);
  }
}

function handleDeployFailure(output: Client['output'], projectId: string, status: DeployJobResponse): void {
  const details = extractFailureDetails(status.error);
  renderFailureDetails(output, projectId, details);
}

function hasStructuredDeployErrors(err: { [key: string]: unknown }): boolean {
  return Array.isArray(err.errors) && err.errors.length > 0;
}

function handleProjectDeployError(client: Client, projectId: string, err: unknown): void {
  if (!isAPIError(err)) {
    client.output.error(`[${projectId}] ${errorToString(err)}`);

    return;
  }

  if (err.status === 401) {
    client.output.log(
      `[${projectId}] You are not logged in. Please log in first by running ${getCommandName('login')}`
    );

    return;
  }

  if (err.status === 409 && typeof err.jobId === 'string') {
    client.output.warn(`[${projectId}] Deploy lock is active for job ${err.jobId}.`);

    return;
  }

  if (err.status === 400 || hasStructuredDeployErrors(err)) {
    renderFailureDetails(client.output, projectId, extractFailureDetails(err));

    return;
  }

  client.output.error(`[${projectId}] ${err.serverMessage}`);
}

export default async function main(client: Client): Promise<number> {
  let argv;
  const { output } = client;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--help': Boolean,
      '-h': '--help',
    });
  } catch (err: unknown) {
    handleError(err);

    return 1;
  }

  if (argv.flags['--help']) {
    output.print(help(deployCommand, { columns: client.stderr.columns }));

    return 2;
  }

  if (client.flexkitConfig === undefined) {
    output.error(
      `No Flexkit configuration file found in the current directory. ` +
        `Please ensure you are executing the command from the correct folder, or ` +
        `run ${getCommandName('init')} to create a new Flexkit project in this directory.`
    );

    return 1;
  }

  const succeededProjectIds: string[] = [];
  const noChangesProjectIds: string[] = [];
  const failedProjectIds: string[] = [];
  const { projects } = client.flexkitConfig;
  let canceled = false;
  const onSigInt = (): void => {
    canceled = true;
    output.warn('Received Ctrl+C. Stopping deploy command.');
  };

  process.once('SIGINT', onSigInt);

  try {
    output.spinner('Deploying schema', 200);

    for (const project of projects) {
      if (canceled) {
        break;
      }

      const schema = project.schema ?? [];
      const scopes = project.scopes ?? [];

      try {
        const job = await startDeployJob(client, project.projectId, schema, scopes);

        if (!job.hasChanges) {
          noChangesProjectIds.push(project.projectId);
          output.log(`[${project.projectId}] ${job.message}`);
          output.dim(`[${project.projectId}] schemaHash=${job.schemaHash}`);
          continue;
        }

        const status = await observeDeployJob(client, project.projectId, job.observe, job.state, () => canceled);

        if (status.state === 'completed') {
          succeededProjectIds.push(project.projectId);
          continue;
        }

        failedProjectIds.push(project.projectId);
        handleDeployFailure(output, project.projectId, status);
      } catch (err: unknown) {
        failedProjectIds.push(project.projectId);
        handleProjectDeployError(client, project.projectId, err);
      }
    }
  } finally {
    process.off('SIGINT', onSigInt);
    output.stopSpinner();
  }

  if (canceled) {
    return 1;
  }

  if (succeededProjectIds.length > 0) {
    const { projectsLabel, projectWord } = formatProjectLabel(succeededProjectIds);
    output.success(`Deploy completed for ${projectWord} ${projectsLabel}.`);
  }

  if (noChangesProjectIds.length > 0) {
    const { projectsLabel, projectWord } = formatProjectLabel(noChangesProjectIds);
    output.log(`No changes to deploy for ${projectWord} ${projectsLabel}.`);
  }

  if (failedProjectIds.length > 0) {
    const { projectsLabel, projectWord } = formatProjectLabel(failedProjectIds);
    output.error(`Deploy failed for ${projectWord} ${projectsLabel}.`);

    return 1;
  }

  return 0;
}
