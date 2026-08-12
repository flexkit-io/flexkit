import type { JSX } from 'react';
import type { ReasoningUIPart, TextUIPart, UIMessage, UIMessageChunk } from 'ai';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { parseJsonEventStream, readUIMessageStream, uiMessageChunkSchema } from 'ai';
import {
  BrainIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleSlashIcon,
  CloudUploadIcon,
  DatabaseZapIcon,
  DownloadIcon,
  LinkIcon,
  FileTextIcon,
  GraduationCapIcon,
  LoaderCircle,
  MessageSquareIcon,
  SearchIcon,
  SendIcon,
  TerminalIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import { useConfig } from '@flexkit/studio';
import { Button } from '@flexkit/studio/ui';
import useSWR from 'swr';
import { createApiClient, fetcher, paths } from './api';
import { ApprovalCard } from './approval-card';
import { RunSpecPart } from './spec-renderer';
import type { AutomationApproval, AutomationRun } from './types';

export function useProjectApi(): { api: ReturnType<typeof createApiClient> | null; projectId: string | undefined } {
  const { currentProjectId } = useConfig();
  const api = useMemo(() => (currentProjectId ? createApiClient(currentProjectId) : null), [currentProjectId]);

  return { api, projectId: currentProjectId };
}

export interface ReplayMetadata {
  model?: string;
}

interface ReplayError {
  message: string;
}

export interface ReplayDataParts {
  [key: string]: unknown;
  'bulk-graphql-action': {
    changedItems?: number;
    failedItems?: number;
    jobId?: string;
    operationName: string;
    processedItems?: number;
    status: 'loading' | 'running' | 'done' | 'error';
    totalItems?: number;
    error?: ReplayError;
  };
  'create-sandbox': {
    sandboxId?: string;
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'execute-graphql': {
    operationType?: 'query' | 'mutation';
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'mutation-approval': {
    approvalId: string;
    affectedCount?: number | null;
    decidedBy?: string;
    operationsSummary: string;
    reason?: string;
    status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'executed' | 'error';
    error?: ReplayError;
  };
  'generating-files': {
    paths: string[];
    status: 'generating' | 'uploading' | 'uploaded' | 'done' | 'error';
    error?: ReplayError;
  };
  'load-skill': {
    attached?: boolean;
    skillName?: string;
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'run-artifact': {
    artifactId?: string;
    contentType?: string;
    filename: string;
    kind?: 'html' | 'pdf';
    sizeBytes?: number;
    status: 'uploading' | 'done' | 'error';
    /** Persistent public URL of the stored artifact. */
    url?: string;
    error?: ReplayError;
  };
  'run-command': {
    args: string[];
    command: string;
    commandId?: string;
    exitCode?: number;
    sandboxId: string;
    status: 'executing' | 'running' | 'waiting' | 'done' | 'error';
    error?: ReplayError;
  };
  'run-summary': {
    status: 'success' | 'skipped' | 'failed';
    summary: string;
  };
  'search-schema': {
    query?: string;
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'tool-delivery': {
    channelId: string;
    channelName: string;
    provider: 'slack' | 'teams';
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'turn-error': {
    message: string;
  };
  'update-memory': {
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
  'user-message': {
    parts: ReplayMessagePart[];
  };
  'validate-graphql': {
    errorCount?: number;
    status: 'loading' | 'valid' | 'invalid' | 'error';
    error?: ReplayError;
  };
  'web-search': {
    query: string;
    status: 'loading' | 'done' | 'error';
    error?: ReplayError;
  };
}

interface ReplayTools {
  [key: string]: {
    input: unknown;
    output: unknown | undefined;
  };
}

export type ReplayMessage = UIMessage<ReplayMetadata, ReplayDataParts, ReplayTools>;
export type ReplayMessagePart = ReplayMessage['parts'][number];
export type RunStreamStatus = 'streaming' | 'paused' | 'finished' | 'error' | 'unavailable';
/** The persisted record status backing a stream (automation run or chat turn). */
export type RunRecordStatus = AutomationRun['status'];
type ConsumeOnceResult = 'finished' | 'incomplete' | 'unavailable';

const MAX_STREAM_ATTEMPTS = 5;
export const STREAM_RETRY_DELAY_MS = 2000;
const REPLAY_RENDER_INTERVAL_MS = 120;
const JSON_RENDER_SPEC_PART_TYPE = 'data-spec';

export interface RunReplayActions {
  onApprovalDecided: (_approvalId?: string) => void;
}

export const RunReplayActionsContext = createContext<RunReplayActions | null>(null);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === 'AbortError' || error.message.toLowerCase().includes('aborted');
}

function isReasoningPart(part: ReplayMessagePart): part is ReasoningUIPart {
  return part.type === 'reasoning';
}

function hasRenderableReasoning(part: ReplayMessagePart): boolean {
  if (!isReasoningPart(part)) {
    return false;
  }

  // Keep streaming indicators, and keep completed rationale for finished /
  // paused replays so reviewers can still see why the agent acted.
  return part.state === 'streaming' || part.text.trim().length > 0;
}

function hasRenderableParts(parts: ReplayMessagePart[]): boolean {
  return parts.some((part) => {
    if (part.type === 'step-start') {
      return false;
    }

    if (part.type === 'reasoning') {
      return hasRenderableReasoning(part);
    }

    return true;
  });
}

function getReasoningLabel(text: string): string {
  const trimmed = text.trim();

  if (!trimmed || /^reasoning\.?$/i.test(trimmed)) {
    return 'Reasoning…';
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? trimmed;
  const maxLength = 72;

  if (firstLine.length <= maxLength) {
    return firstLine;
  }

  return `${firstLine.slice(0, maxLength).trimEnd()}…`;
}

function getMarkerIds(messages: ReplayMessage[]): Set<string> {
  const markerIds = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'data-user-message' && part.id) {
        markerIds.add(part.id);
      }
    }
  }

  return markerIds;
}

function splitSessionMessages(messages: ReplayMessage[]): ReplayMessage[] {
  const markerIds = getMarkerIds(messages);
  const result: ReplayMessage[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      if (!markerIds.has(message.id)) {
        result.push(message);
      }

      continue;
    }

    if (message.role !== 'assistant') {
      result.push(message);

      continue;
    }

    let parts: ReplayMessagePart[] = [];
    let chunkIndex = 0;

    const flush = (): void => {
      if (hasRenderableParts(parts)) {
        result.push({ ...message, id: `${message.id}-${chunkIndex.toString()}`, parts });
      }

      chunkIndex++;
      parts = [];
    };

    for (const part of message.parts) {
      if (part.type === 'data-user-message') {
        const data = getPartData<ReplayDataParts['user-message']>(part);

        flush();
        result.push({
          id: part.id ?? crypto.randomUUID(),
          parts: data.parts,
          role: 'user',
        });

        continue;
      }

      parts.push(part);
    }

    flush();
  }

  return result;
}

export function useSessionMessages(messages: ReplayMessage[]): ReplayMessage[] {
  return useMemo(() => splitSessionMessages(messages), [messages]);
}

export function getPartData<T>(part: ReplayMessagePart): T {
  return (part as { data: T }).data;
}

export function messageHasPendingMutationApproval(message: ReplayMessage | undefined): boolean {
  if (!message) {
    return false;
  }

  return message.parts.some((part) => {
    if (part.type !== 'data-mutation-approval') {
      return false;
    }

    return getPartData<ReplayDataParts['mutation-approval']>(part).status === 'pending';
  });
}

export function isTerminalRunStatus(status: RunRecordStatus | null | undefined): boolean {
  return status === 'success' || status === 'failed' || status === 'cancelled' || status === 'skipped';
}

export function getMutationApprovalIds(
  message: ReplayMessage | undefined,
  options?: { pendingOnly?: boolean }
): string[] {
  if (!message) {
    return [];
  }

  const approvalIds: string[] = [];
  const pendingOnly = options?.pendingOnly ?? false;

  for (const part of message.parts) {
    if (part.type !== 'data-mutation-approval') {
      continue;
    }

    const data = getPartData<ReplayDataParts['mutation-approval']>(part);

    if (pendingOnly && data.status !== 'pending') {
      continue;
    }

    approvalIds.push(data.approvalId);
  }

  return approvalIds;
}

export function getPendingMutationApprovalIds(message: ReplayMessage | undefined): string[] {
  return getMutationApprovalIds(message, { pendingOnly: true });
}

function shouldPauseStreamForApproval({
  latestMessage,
  recordStatus,
  suppressApprovalPause,
}: {
  latestMessage: ReplayMessage | undefined;
  recordStatus: RunRecordStatus | null | undefined;
  suppressApprovalPause: boolean;
}): boolean {
  if (isTerminalRunStatus(recordStatus)) {
    return false;
  }

  // After a local approval decision the run/stream can still look suspended
  // until the workflow hook resumes — keep reconnecting in that case.
  if (suppressApprovalPause) {
    return false;
  }

  // The run record is authoritative once execution has resumed. A stale
  // pending data-mutation-approval part can linger in the replay until the
  // next workflow step writes an updated status.
  if (recordStatus === 'running') {
    return false;
  }

  if (recordStatus === 'awaiting_approval') {
    return true;
  }

  // Fall back to the stream part when the run record hasn't caught up yet.
  return messageHasPendingMutationApproval(latestMessage);
}

export function useRunStream(
  streamApi: string,
  options?: {
    recordStatus?: RunRecordStatus | null;
    resumeToken?: number;
    suppressApprovalPause?: boolean;
  }
): {
  message: ReplayMessage | undefined;
  status: RunStreamStatus;
} {
  const [message, setMessage] = useState<ReplayMessage>();
  const [status, setStatus] = useState<RunStreamStatus>('streaming');
  const recordStatus = options?.recordStatus;
  const resumeToken = options?.resumeToken ?? 0;
  // Read via ref so clearing the post-decide suppress window does not abort a
  // healthy reconnect the way resetting resumeToken would.
  const suppressApprovalPauseRef = useRef(options?.suppressApprovalPause ?? false);
  suppressApprovalPauseRef.current = options?.suppressApprovalPause ?? false;
  const streamApiRef = useRef(streamApi);
  const messageRef = useRef(message);
  messageRef.current = message;

  useEffect(() => {
    const streamChanged = streamApiRef.current !== streamApi;
    streamApiRef.current = streamApi;

    if (!streamApi) {
      setMessage(undefined);
      setStatus('unavailable');

      return;
    }

    const abortController = new AbortController();
    // Approval resume and record-status updates restart this effect (they bump
    // resumeToken / recordStatus) but the stream identity is unchanged. Keep
    // the in-memory replay while consumeOnce rebuilds from startIndex=0.
    let latestMessage: ReplayMessage | undefined = streamChanged ? undefined : messageRef.current;

    if (streamChanged) {
      setMessage(undefined);
    }

    setStatus('streaming');

    // The chat stream URL already carries a workflowRunId query parameter.
    const startIndexSeparator = streamApi.includes('?') ? '&' : '?';

    const consumeOnce = async (): Promise<ConsumeOnceResult> => {
      const response = await fetch(`${streamApi}${startIndexSeparator}startIndex=0`, {
        credentials: 'include',
        signal: abortController.signal,
      });

      if (response.status === 404) {
        return 'unavailable';
      }

      if (!response.ok || !response.body) {
        throw new Error(`Failed to fetch the run stream (status ${response.status.toString()})`);
      }

      let sawFinish = false;
      const parsedStream = parseJsonEventStream({ schema: uiMessageChunkSchema, stream: response.body });
      type ParsedChunk = typeof parsedStream extends ReadableStream<infer T> ? T : never;

      const chunkStream = parsedStream.pipeThrough(
        new TransformStream<ParsedChunk, UIMessageChunk>({
          transform: (result, controller) => {
            if (!result.success) {
              throw result.error;
            }

            if (result.value.type === 'finish') {
              sawFinish = true;
            }

            controller.enqueue(result.value);
          },
        })
      );

      const messageStream = readUIMessageStream<ReplayMessage>({
        onError: (error) => {
          console.error('Run stream chunk error', error);
        },
        stream: chunkStream,
      });

      // Rendering after every chunk makes long replays (thousands of chunks,
      // e.g. large streamed tool inputs) re-render the whole message tree per
      // chunk and freeze the page. Throttle to one trailing update per
      // interval, with a guaranteed final flush after the stream ends.
      let throttleTimer: number | null = null;

      const flushLatestMessage = (): void => {
        if (abortController.signal.aborted || !latestMessage) {
          return;
        }

        setMessage({ ...latestMessage });
      };

      try {
        for await (const current of messageStream) {
          if (abortController.signal.aborted) {
            break;
          }

          latestMessage = current;

          if (throttleTimer === null) {
            throttleTimer = window.setTimeout(() => {
              throttleTimer = null;
              flushLatestMessage();
            }, REPLAY_RENDER_INTERVAL_MS);
          }
        }
      } finally {
        if (throttleTimer !== null) {
          window.clearTimeout(throttleTimer);
          throttleTimer = null;
        }

        flushLatestMessage();
      }

      return sawFinish ? 'finished' : 'incomplete';
    };

    const consume = async (): Promise<void> => {
      let attempt = 0;

      while (!abortController.signal.aborted) {
        if (attempt > 0) {
          await delay(STREAM_RETRY_DELAY_MS);
        }

        try {
          const result = await consumeOnce();

          if (abortController.signal.aborted) {
            return;
          }

          if (result === 'unavailable') {
            setStatus('unavailable');

            return;
          }

          // The stream route wraps every readable session with a finish chunk,
          // including sessions that close while the durable workflow continues.
          // Only the run record can confirm that the run itself finished.
          if (result === 'finished' && isTerminalRunStatus(recordStatus)) {
            setStatus('finished');

            return;
          }

          // The run record is authoritative once it reaches a terminal status.
          // Without this, a lingering post-decide suppress flag would reconnect
          // forever when the replay never emits a finish chunk.
          if (isTerminalRunStatus(recordStatus)) {
            setStatus('finished');

            return;
          }

          // Workflow hooks close the readable without a finish chunk while the
          // run is suspended on a mutation approval. Pause instead of treating
          // that as an error or a perpetual "Running..." state.
          if (
            shouldPauseStreamForApproval({
              latestMessage,
              recordStatus,
              suppressApprovalPause: suppressApprovalPauseRef.current,
            })
          ) {
            setStatus('paused');

            return;
          }

          // Keep reconnecting while the run is active, or right after a local
          // approval decision while the workflow is still waking up.
          const shouldKeepRetrying = recordStatus === 'running' || suppressApprovalPauseRef.current;

          if (!shouldKeepRetrying && attempt >= MAX_STREAM_ATTEMPTS - 1) {
            setStatus('error');

            return;
          }
        } catch (error) {
          if (abortController.signal.aborted || isAbortError(error)) {
            return;
          }

          console.error('Run stream error', error);

          if (isTerminalRunStatus(recordStatus)) {
            setStatus('finished');

            return;
          }

          const shouldKeepRetrying = recordStatus === 'running' || suppressApprovalPauseRef.current;

          if (!shouldKeepRetrying && attempt >= MAX_STREAM_ATTEMPTS - 1) {
            setStatus('error');

            return;
          }
        }

        attempt += 1;
      }
    };

    const loadTimeout = window.setTimeout(() => {
      void consume();
    }, 0);

    return () => {
      window.clearTimeout(loadTimeout);
      abortController.abort('Run replay unmounted');
    };
  }, [recordStatus, resumeToken, streamApi]);

  return { message, status };
}

export function toMutationApprovalPartData(approval: AutomationApproval): ReplayDataParts['mutation-approval'] {
  return {
    affectedCount: approval.affectedCount,
    approvalId: approval.id,
    decidedBy: approval.decidedBy ?? undefined,
    operationsSummary: approval.operationsSummary,
    reason: approval.reason ?? undefined,
    status: approval.status,
  };
}

/**
 * Models sometimes wrap json-render patch lines in a Markdown code fence
 * despite instructions. The patch lines are consumed by the spec pipeline,
 * leaving stray fence-only text parts behind; those are never meaningful.
 */
export function isCodeFenceOnlyText(text: string): boolean {
  const trimmed = text.trim();

  if (!trimmed) {
    return false;
  }

  return trimmed.split('\n').every((line) => /^`{3,}[\w-]*$/.test(line.trim()));
}

export function MessagePart({
  api,
  part,
  partIndex,
  parts,
}: {
  api: ReturnType<typeof createApiClient>;
  part: ReplayMessagePart;
  partIndex: number;
  parts: ReplayMessagePart[];
}): JSX.Element | null {
  if (part.type === 'step-start') {
    return null;
  }

  if (part.type === 'text') {
    const isStrayFence =
      isCodeFenceOnlyText(part.text) && parts.some((otherPart) => otherPart.type === JSON_RENDER_SPEC_PART_TYPE);

    return isStrayFence ? null : <TextPart part={part} />;
  }

  if (isReasoningPart(part)) {
    return hasRenderableReasoning(part) ? (
      <ReasoningPart streaming={part.state === 'streaming'} text={part.text} />
    ) : null;
  }

  if (part.type === 'data-generating-files') {
    return <GenerateFilesPart message={getPartData<ReplayDataParts['generating-files']>(part)} />;
  }

  if (part.type === 'data-run-artifact') {
    return <RunArtifactPart api={api} message={getPartData<ReplayDataParts['run-artifact']>(part)} />;
  }

  if (part.type === 'data-tool-delivery') {
    return <ToolDeliveryPart message={getPartData<ReplayDataParts['tool-delivery']>(part)} />;
  }

  if (part.type === 'data-run-summary') {
    return <RunSummaryPart message={getPartData<ReplayDataParts['run-summary']>(part)} />;
  }

  if (part.type === 'data-turn-error') {
    const data = getPartData<ReplayDataParts['turn-error']>(part);

    return (
      <ToolMessage className="fk:border-red-700/40">
        <ToolHeader>
          <XCircleIcon className="fk:size-3.5 fk:text-red-700" />
          <span>Turn failed</span>
        </ToolHeader>
        <p className="fk:whitespace-pre-wrap fk:text-xs">{data.message}</p>
      </ToolMessage>
    );
  }

  if (part.type === 'data-run-command') {
    const data = getPartData<ReplayDataParts['run-command']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<TerminalIcon className="fk:size-3.5" />}
        loading={['executing', 'running', 'waiting'].includes(data.status)}
        message={
          data.status === 'error'
            ? (data.error?.message ?? `Command failed: ${data.command}`)
            : `${data.status === 'done' ? 'Ran' : 'Running'} ${data.command} ${data.args.join(' ')}`
        }
        title="Run command"
      />
    );
  }

  if (part.type === 'data-search-schema') {
    const data = getPartData<ReplayDataParts['search-schema']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<SearchIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? 'Failed to search schema')
            : `${data.status === 'done' ? 'Searched' : 'Searching'}${data.query ? ` "${data.query}"` : ' schema'}`
        }
        title="Search schema"
      />
    );
  }

  if (part.type === 'data-web-search') {
    const data = getPartData<ReplayDataParts['web-search']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<SearchIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? 'Failed to search the web')
            : `${data.status === 'done' ? 'Searched' : 'Searching'} "${data.query}"`
        }
        title="Web search"
      />
    );
  }

  if (part.type === 'data-validate-graphql') {
    const data = getPartData<ReplayDataParts['validate-graphql']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<DatabaseZapIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={getValidateGraphqlMessage(data)}
        title="Validate GraphQL"
      />
    );
  }

  if (part.type === 'data-execute-graphql') {
    const data = getPartData<ReplayDataParts['execute-graphql']>(part);
    const operationLabel = data.operationType === 'mutation' ? 'mutation' : 'query';

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<DatabaseZapIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? `Failed to execute ${operationLabel}`)
            : `${data.status === 'done' ? 'Executed' : 'Executing'} ${operationLabel}`
        }
        title="Execute GraphQL"
      />
    );
  }

  if (part.type === 'data-mutation-approval') {
    return <MutationApprovalPart api={api} message={getPartData<ReplayDataParts['mutation-approval']>(part)} />;
  }

  if (part.type === 'data-bulk-graphql-action') {
    return <BulkGraphqlActionPart message={getPartData<ReplayDataParts['bulk-graphql-action']>(part)} />;
  }

  if (part.type === 'data-load-skill') {
    const data = getPartData<ReplayDataParts['load-skill']>(part);
    const skillLabel = data.skillName ? ` "${data.skillName}"` : '';
    let message = 'Loading skill';

    if (data.status === 'error') {
      message = data.error?.message ?? 'Failed to load skill';
    } else if (data.status === 'done' && data.attached) {
      message = `Using attached skill${skillLabel}`;
    } else if (data.status === 'done') {
      message = `Loaded skill${skillLabel}`;
    }

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<GraduationCapIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={message}
        title={data.attached ? 'Skill' : 'Load skill'}
      />
    );
  }

  if (part.type === 'data-update-memory') {
    const data = getPartData<ReplayDataParts['update-memory']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<CheckCircle2Icon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? 'Failed to update memory')
            : data.status === 'done'
              ? 'Updated memory'
              : 'Updating memory'
        }
        title="Update memory"
      />
    );
  }

  if (part.type === 'data-create-sandbox') {
    const data = getPartData<ReplayDataParts['create-sandbox']>(part);

    return (
      <StatusToolPart
        error={data.error?.message}
        icon={<TerminalIcon className="fk:size-3.5" />}
        loading={data.status === 'loading'}
        message={
          data.status === 'error'
            ? (data.error?.message ?? 'Failed to create sandbox')
            : data.status === 'done'
              ? 'Created sandbox'
              : 'Creating sandbox'
        }
        title="Create sandbox"
      />
    );
  }

  if (part.type === JSON_RENDER_SPEC_PART_TYPE) {
    const nextSpecPart = parts.slice(partIndex + 1).find((nextPart) => nextPart.type === JSON_RENDER_SPEC_PART_TYPE);

    if (nextSpecPart) {
      return null;
    }

    return <RunSpecPart parts={parts} />;
  }

  if (part.type.startsWith('data-')) {
    return <UnknownDataPart part={part} />;
  }

  return null;
}

function TextPart({ part }: { part: TextUIPart }): JSX.Element {
  return (
    <div className="fk:min-w-0 fk:max-w-full fk:overflow-x-auto fk:whitespace-pre-wrap fk:rounded-xl fk:bg-muted fk:px-4 fk:py-3 fk:text-sm fk:font-light fk:leading-relaxed fk:text-secondary-foreground">
      {part.text}
    </div>
  );
}

export function ReasoningPart({ streaming, text }: { streaming: boolean; text: string }): JSX.Element {
  if (streaming) {
    return (
      <p
        className="fk:shimmer fk:inline-flex fk:items-center fk:gap-1.5 fk:text-sm fk:text-muted-foreground fk:shimmer-duration-1000"
        role="status"
      >
        <BrainIcon aria-hidden className="fk:size-3.5 fk:shrink-0" />
        {getReasoningLabel(text)}
      </p>
    );
  }

  return (
    <details className="fk:rounded-xl fk:border fk:border-border fk:bg-muted/30 fk:px-3.5 fk:py-3">
      <summary className="fk:flex fk:cursor-pointer fk:items-center fk:gap-1.5 fk:text-sm fk:font-medium fk:text-muted-foreground">
        <BrainIcon aria-hidden className="fk:size-3.5 fk:shrink-0" />
        Reasoning
      </summary>
      <p className="fk:mt-2 fk:whitespace-pre-wrap fk:text-xs fk:text-muted-foreground">{text}</p>
    </details>
  );
}

export function ToolMessage({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={`fk:min-w-0 fk:max-w-full fk:overflow-x-auto fk:rounded-xl fk:border fk:border-border fk:bg-background fk:px-3.5 fk:py-3 fk:text-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function ToolHeader({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="fk:flex fk:items-center fk:gap-2 fk:font-medium fk:text-muted-foreground">{children}</div>;
}

function StatusIcon({ isError, loading }: { isError?: boolean; loading?: boolean }): JSX.Element {
  if (loading) {
    return <LoaderCircle className="fk:size-4 fk:animate-spin" />;
  }

  if (isError) {
    return <XIcon className="fk:size-4 fk:text-red-700" />;
  }

  return <CheckIcon className="fk:size-4" />;
}

export function StatusToolPart({
  error,
  icon,
  loading,
  message,
  title,
}: {
  error?: string;
  icon: React.ReactNode;
  loading: boolean;
  message: string;
  title: string;
}): JSX.Element {
  return (
    <ToolMessage>
      <ToolHeader>
        {icon}
        {title}
      </ToolHeader>
      <div className="fk:relative fk:min-h-5 fk:pl-6">
        <span className="fk:absolute fk:left-0 fk:top-0">
          <StatusIcon isError={Boolean(error)} loading={loading} />
        </span>
        <span className="fk:text-xs">{message}</span>
      </div>
    </ToolMessage>
  );
}

function GenerateFilesPart({ message }: { message: ReplayDataParts['generating-files'] }): JSX.Element {
  const lastInProgress = ['error', 'uploading', 'generating'].includes(message.status);
  const generated = lastInProgress ? message.paths.slice(0, message.paths.length - 1) : message.paths;
  const generating = lastInProgress ? (message.paths[message.paths.length - 1] ?? '') : null;

  return (
    <ToolMessage>
      <ToolHeader>
        <CloudUploadIcon className="fk:size-3.5" />
        <span>{message.status === 'done' ? 'Uploaded files' : 'Generating files'}</span>
      </ToolHeader>
      <div className="fk:space-y-1 fk:text-sm">
        {generated.map((path, index) => (
          <div className="fk:flex fk:items-center fk:gap-2" key={`${path}-${index.toString()}`}>
            <CheckIcon className="fk:size-4" />
            <span className="fk:whitespace-pre-wrap">{path}</span>
          </div>
        ))}
        {typeof generating === 'string' ? (
          <div className="fk:flex fk:items-center fk:gap-2">
            <StatusIcon isError={message.status === 'error'} loading={message.status !== 'error'} />
            <span>{message.status === 'error' ? (message.error?.message ?? generating) : generating}</span>
          </div>
        ) : null}
      </div>
    </ToolMessage>
  );
}

export function RunArtifactPart({
  api,
  message,
}: {
  api: ReturnType<typeof createApiClient>;
  message: ReplayDataParts['run-artifact'];
}): JSX.Element {
  const isDone = message.status === 'done' && message.artifactId;
  const previewUrl = isDone ? api.getArtifactUrl(message.artifactId ?? '') : '';
  const downloadUrl = isDone ? api.getArtifactUrl(message.artifactId ?? '', { download: true }) : '';
  const bytes = formatBytes(message.sizeBytes);

  return (
    <ToolMessage>
      <ToolHeader>
        <FileTextIcon className="fk:size-3.5" />
        {message.status === 'done' ? 'Published artifact' : 'Publishing artifact'}
      </ToolHeader>
      <div className="fk:relative fk:min-h-5 fk:pl-6">
        <span className="fk:absolute fk:left-0 fk:top-0">
          <StatusIcon isError={message.status === 'error'} loading={message.status === 'uploading'} />
        </span>
        <div className="fk:min-w-0 fk:space-y-2">
          <div className="fk:min-w-0">
            <div className="fk:truncate fk:font-medium">{message.filename}</div>
            <div className="fk:text-xs fk:text-muted-foreground">
              {message.status === 'uploading' && 'Uploading to artifacts'}
              {message.status === 'done' && [getArtifactLabel(message), bytes].filter(Boolean).join(' · ')}
              {message.status === 'error' && (message.error?.message ?? 'Failed to publish artifact')}
            </div>
          </div>
          {isDone ? (
            <div className="fk:flex fk:flex-wrap fk:gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={previewUrl} rel="noreferrer" target="_blank">
                  Preview
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={downloadUrl}>
                  <DownloadIcon className="fk:size-3" />
                  Download
                </a>
              </Button>
              {message.url ? (
                <Button asChild size="sm" variant="outline">
                  <a href={message.url} rel="noreferrer" target="_blank">
                    <LinkIcon className="fk:size-3" />
                    Permanent link
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </ToolMessage>
  );
}

function ToolDeliveryPart({ message }: { message: ReplayDataParts['tool-delivery'] }): JSX.Element {
  const providerLabel = message.provider === 'slack' ? 'Slack' : 'Microsoft Teams';
  const icon =
    message.provider === 'slack' ? <MessageSquareIcon className="fk:size-3.5" /> : <SendIcon className="fk:size-3.5" />;

  return (
    <StatusToolPart
      error={message.error?.message}
      icon={icon}
      loading={message.status === 'loading'}
      message={
        message.status === 'error'
          ? (message.error?.message ?? `Failed to send result to ${message.channelName}`)
          : `${message.status === 'done' ? 'Sent' : 'Sending'} result to ${message.channelName}`
      }
      title={`${providerLabel} Delivery`}
    />
  );
}

function RunSummaryPart({ message }: { message: ReplayDataParts['run-summary'] }): JSX.Element {
  const icon =
    message.status === 'success' ? (
      <CheckCircle2Icon className="fk:size-3.5 fk:text-green-700" />
    ) : message.status === 'skipped' ? (
      <CircleSlashIcon className="fk:size-3.5" />
    ) : (
      <XCircleIcon className="fk:size-3.5 fk:text-red-700" />
    );
  const title =
    message.status === 'success' ? 'Run completed' : message.status === 'skipped' ? 'Run skipped' : 'Run failed';

  return (
    <ToolMessage className={message.status === 'failed' ? 'fk:border-red-700/40' : 'fk:border-green-700/40'}>
      <ToolHeader>
        {icon}
        <span>{title}</span>
      </ToolHeader>
      {message.status === 'failed' ? <p className="fk:whitespace-pre-wrap fk:text-xs">{message.summary}</p> : null}
    </ToolMessage>
  );
}

interface ApprovalResponse {
  approval: AutomationApproval;
}

export function MutationApprovalPart({
  api,
  message,
}: {
  api: ReturnType<typeof createApiClient>;
  message: ReplayDataParts['mutation-approval'];
}): JSX.Element {
  const { projectId } = useProjectApi();
  const replayActions = useContext(RunReplayActionsContext);
  const previousApprovalStatusRef = useRef<AutomationApproval['status'] | undefined>(undefined);
  // Poll while the stream still says pending so a decision from the Approvals
  // inbox / another tab updates this card. RunReplay refreshes the run record
  // on the same interval but does not touch this approval fetch.
  const { data, error, isValidating, mutate } = useSWR<ApprovalResponse>(
    projectId ? paths(projectId).approval(message.approvalId) : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        if (message.status !== 'pending') {
          return 0;
        }

        if (latestData?.approval?.status && latestData.approval.status !== 'pending') {
          return 0;
        }

        return STREAM_RETRY_DELAY_MS;
      },
    }
  );
  const approvalStatus = data?.approval?.status;
  const isPending = (approvalStatus ?? message.status) === 'pending';

  // The stream part changes when the proposal is decided or executed; refresh
  // the full approval (preview, result, error) from the API when that happens.
  useEffect(() => {
    void mutate();
  }, [message.status, mutate]);

  // When polling discovers an external decide while the replay part is still
  // pending, reconnect the stream the same way a local decide does. Only a
  // pending -> decided transition observed while mounted counts: a card that
  // mounts with an already-decided approval (e.g. right after a reconnect
  // remounted it) must not trigger another reconnect, or it would loop.
  useEffect(() => {
    const previousStatus = previousApprovalStatusRef.current;
    previousApprovalStatusRef.current = approvalStatus;

    if (message.status !== 'pending' || !approvalStatus || approvalStatus === 'pending') {
      return;
    }

    if (previousStatus !== 'pending') {
      return;
    }

    replayActions?.onApprovalDecided(data?.approval?.id ?? message.approvalId);
  }, [approvalStatus, data?.approval?.id, message.approvalId, message.status, replayActions]);

  function handleDecided(nextApproval: AutomationApproval): void {
    // Keep the external-decide effect from bumping resumeToken again after a
    // local decide already reconnected the stream.
    if (nextApproval.status !== 'pending') {
      previousApprovalStatusRef.current = nextApproval.status;
    }

    void mutate();
    // Revalidate the run record and reconnect the workflow stream so the page
    // reflects resumed execution instead of a stale awaiting_approval/error state.
    replayActions?.onApprovalDecided(nextApproval.id);
  }

  let body: JSX.Element;

  if (data?.approval) {
    body = <ApprovalCard api={api} approval={data.approval} key={data.approval.status} onDecided={handleDecided} />;
  } else if (error && !isValidating) {
    const detail = error instanceof Error && error.message ? error.message : 'Request failed';

    body = (
      <div className="fk:space-y-2">
        <p className="fk:text-xs fk:text-destructive">
          Failed to load proposal {message.operationsSummary}: {detail}
        </p>
        <Button size="sm" variant="outline" onClick={() => void mutate()}>
          Retry
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="fk:flex fk:items-center fk:gap-2 fk:text-xs fk:text-muted-foreground">
        <LoaderCircle className="fk:size-3.5 fk:animate-spin" />
        <span>Loading proposal {message.operationsSummary}...</span>
      </div>
    );
  }

  return (
    <ToolMessage>
      <ToolHeader>
        <DatabaseZapIcon className="fk:size-3.5" />
        Mutation approval
        {isPending ? <LoaderCircle className="fk:ml-1 fk:size-3.5 fk:animate-spin" /> : null}
      </ToolHeader>
      <div className="fk:mt-2">{body}</div>
      {message.status === 'error' && message.error ? (
        <p className="fk:mt-2 fk:text-xs fk:text-destructive">{message.error.message}</p>
      ) : null}
    </ToolMessage>
  );
}

function BulkGraphqlActionPart({ message }: { message: ReplayDataParts['bulk-graphql-action'] }): JSX.Element {
  const progress = [
    typeof message.processedItems === 'number' ? `${message.processedItems.toString()} processed` : '',
    typeof message.changedItems === 'number' ? `${message.changedItems.toString()} changed` : '',
    typeof message.failedItems === 'number' ? `${message.failedItems.toString()} failed` : '',
    typeof message.totalItems === 'number' ? `${message.totalItems.toString()} total` : '',
  ].filter(Boolean);

  return (
    <StatusToolPart
      error={message.error?.message}
      icon={<DatabaseZapIcon className="fk:size-3.5" />}
      loading={message.status === 'loading' || message.status === 'running'}
      message={
        message.status === 'error'
          ? (message.error?.message ?? `Failed bulk ${message.operationName}`)
          : `${message.status === 'done' ? 'Completed' : 'Running'} ${message.operationName}${
              progress.length > 0 ? ` (${progress.join(', ')})` : ''
            }`
      }
      title="Bulk GraphQL action"
    />
  );
}

function UnknownDataPart({ part }: { part: ReplayMessagePart }): JSX.Element {
  return (
    <ToolMessage className="fk:bg-muted/30">
      <ToolHeader>
        <CheckCircle2Icon className="fk:size-3.5" />
        {part.type.replace(/^data-/, '').replaceAll('-', ' ')}
      </ToolHeader>
      <p className="fk:text-xs fk:text-muted-foreground">
        This run emitted a structured event that is not yet rendered by Studio.
      </p>
    </ToolMessage>
  );
}

function getValidateGraphqlMessage(message: ReplayDataParts['validate-graphql']): string {
  if (message.status === 'error') {
    return message.error?.message ?? 'Failed to validate GraphQL';
  }

  if (message.status === 'invalid') {
    const count = message.errorCount ?? 0;

    return `Validation failed with ${count.toString()} ${count === 1 ? 'error' : 'errors'}`;
  }

  if (message.status === 'valid') {
    return 'GraphQL operation is valid';
  }

  return 'Validating GraphQL';
}

function formatBytes(sizeBytes?: number): string {
  if (typeof sizeBytes !== 'number') {
    return '';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes.toString()} B`;
  }

  const kilobytes = sizeBytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function getArtifactLabel(message: ReplayDataParts['run-artifact']): string {
  if (message.kind === 'pdf') {
    return 'PDF artifact';
  }

  if (message.kind === 'html') {
    return 'HTML artifact';
  }

  return 'Artifact';
}
