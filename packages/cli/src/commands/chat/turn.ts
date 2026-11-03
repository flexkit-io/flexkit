import chalk from 'chalk';
import type Client from '../../util/client';
import { getCommandName } from '../../util/pkg';
import sleep from '../../util/sleep';
import { readEventStream, parseEventJson, type ServerSentEvent } from '../../util/sse';
import { getApiErrorMessage } from '../../util/command-group';
import { isAPIError } from '../../util/error-utils';
import {
  createChatRenderer,
  TERMINAL_MESSAGE_STATUSES,
  toQuestionAnswers,
  type ChatApprovalData,
  type ChatChunk,
  type ChatMessage,
  type ChatQuestionData,
  type ChatRenderer,
  type RenderAction,
} from './render';

export interface ChatTurn {
  assistantMessage: ChatMessage;
  userMessage: ChatMessage;
  workflowRunId: string;
}

export interface ChatSummary {
  createdAt: string;
  id: string;
  lastMessageAt: string | null;
  modelId: string | null;
  title: string | null;
  updatedAt: string;
}

/** What `POST /agent/chats/:chatId/follow-ups` answers. */
type FollowUpResult =
  | { followUp: { delivery: 'steer' | 'queue'; message: ChatMessage } }
  | { question: { id: string; chatMessageId: string; status: string } }
  | { turn: ChatTurn };

interface ChatStatus {
  activeMonitorCount: number;
  chat: ChatSummary;
  latestMessage: { id: string; status: string; workflowRunId: string | null } | null;
}

export interface TurnOptions {
  client: Client;
  projectId: string;
  /** Print raw chunks as NDJSON on stdout instead of rendering them. */
  json: boolean;
  /** Ask questions and approvals in the terminal; otherwise stop and print how to continue. */
  interactive: boolean;
  modelId?: string;
}

/** How a streamed turn ended. `waiting`: it waits on an answer or approval the CLI could not give. */
export type TurnOutcome = 'finished' | 'failed' | 'waiting' | 'stopped';

export const EXIT_WAITING = 3;
export const EXIT_STOPPED = 130;

const chatPath = (chatId: string): string => `/agent/chats/${encodeURIComponent(chatId)}`;

function shortJson(value: unknown): string {
  return JSON.stringify(value);
}

/** Starts a new chat with its first message. */
export async function startChat(opts: TurnOptions, content: string): Promise<{ chat: ChatSummary; turn: ChatTurn }> {
  return opts.client.fetch<{ chat: ChatSummary; turn: ChatTurn }>('/agent/chats', {
    projectId: opts.projectId,
    method: 'POST',
    body: { message: { content }, modelId: opts.modelId ?? null },
  });
}

/**
 * Sends a message to an existing chat. When no turn runs it starts the next
 * one; while a turn runs it steers or queues it, or answers the question that
 * turn waits on.
 */
export async function sendFollowUp(opts: TurnOptions, chatId: string, content: string): Promise<FollowUpResult> {
  return opts.client.fetch<FollowUpResult>(`${chatPath(chatId)}/follow-ups`, {
    projectId: opts.projectId,
    method: 'POST',
    body: { content, modelId: opts.modelId ?? null },
  });
}

export async function getChatStatus(opts: TurnOptions, chatId: string): Promise<ChatStatus> {
  return opts.client.fetch<ChatStatus>(`${chatPath(chatId)}?view=status`, { projectId: opts.projectId });
}

async function stopTurn(opts: TurnOptions, chatId: string): Promise<void> {
  try {
    await opts.client.fetch(`${chatPath(chatId)}/stop`, { projectId: opts.projectId, method: 'POST' });
  } catch {
    // Nothing was running any more.
  }
}

async function answerQuestion(opts: TurnOptions, chatId: string, question: ChatQuestionData): Promise<boolean> {
  const { client } = opts;
  const picks: { selected: string[]; other?: string }[] = [];
  const OTHER = '\u0000other';

  client.output.print(`\n${chalk.bold('The agent asks:')}\n`);

  for (const item of question.questions) {
    const choices = [
      ...item.options.map((option) => ({ name: option.label, value: option.label, description: option.description })),
      { name: 'Other (type your own answer)', value: OTHER },
    ];
    let selected: string[];

    if (item.multiSelect) {
      selected = await client.input.checkbox<string>({ message: item.question, choices });
    } else {
      selected = [await client.input.select<string>({ message: item.question, choices })];
    }

    const wantsOther = selected.includes(OTHER);
    const other = wantsOther ? await client.input.text({ message: 'Your answer:' }) : undefined;

    picks.push({ selected: selected.filter((label) => label !== OTHER), other });
  }

  const res = await client.rawFetch(`${chatPath(chatId)}/questions/${encodeURIComponent(question.questionId)}/answer`, {
    projectId: opts.projectId,
    method: 'POST',
    body: { action: 'answer', answers: toQuestionAnswers(picks) },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { errorMessage?: string; error?: string };

    client.output.warn(data.errorMessage ?? data.error ?? `Could not send the answer (${res.status}).`);

    return false;
  }

  return true;
}

async function decideApproval(opts: TurnOptions, approval: ChatApprovalData): Promise<'decided' | 'pending'> {
  const { client } = opts;
  const affected = typeof approval.affectedCount === 'number' ? ` (${approval.affectedCount} affected)` : '';

  client.output.print(`\n${chalk.bold('The agent proposes a change:')} ${approval.operationsSummary}${affected}\n`);

  if (approval.reason) {
    client.output.print(`${chalk.dim(approval.reason)}\n`);
  }

  for (;;) {
    const choice = await client.input.select<'approve' | 'reject' | 'details' | 'later'>({
      message: 'Apply this change?',
      choices: [
        { name: 'Approve', value: 'approve' },
        { name: 'Reject', value: 'reject' },
        { name: 'Show the operations', value: 'details' },
        { name: 'Decide later (leave it pending and exit)', value: 'later' },
      ],
    });

    if (choice === 'later') {
      return 'pending';
    }

    if (choice === 'details') {
      const detail = await client.fetch<{ approval: { operations: unknown; preview: unknown } }>(
        `/automations/approvals/${encodeURIComponent(approval.approvalId)}`,
        { projectId: opts.projectId }
      );

      client.output.print(`${JSON.stringify(detail.approval.operations, null, 2)}\n`);
      continue;
    }

    const reason = choice === 'reject' ? await client.input.text({ message: 'Reason (optional):' }) : '';

    try {
      await client.fetch(`/automations/approvals/${encodeURIComponent(approval.approvalId)}/decide`, {
        projectId: opts.projectId,
        method: 'POST',
        body: { approved: choice === 'approve', ...(reason.trim() ? { reason: reason.trim() } : {}) },
      });
    } catch (err: unknown) {
      client.output.warn(getApiErrorMessage(err));
    }

    return 'decided';
  }
}

function printWaitingHint(opts: TurnOptions, chatId: string, waiting: RenderAction): void {
  const { output } = opts.client;

  if (waiting.kind === 'question') {
    output.warn('The agent asked a question and waits for your answer:');

    for (const item of waiting.question.questions) {
      output.print(`  ${item.question}\n`);

      for (const option of item.options) {
        output.print(`    - ${option.label}${option.description ? chalk.dim(` · ${option.description}`) : ''}\n`);
      }
    }

    output.print(`Answer it with ${getCommandName(`chat --chat ${chatId} "<your answer>"`)} or in Studio.\n`);
  } else if (waiting.kind === 'approval') {
    output.warn(`The agent proposes a change and waits for approval: ${waiting.approval.operationsSummary}`);
    output.print(
      `Review it with ${getCommandName(`approvals inspect ${waiting.approval.approvalId}`)} or in Studio, then the turn continues.\n`
    );
  }
}

function writeAction(opts: TurnOptions, action: RenderAction): void {
  const { client } = opts;

  switch (action.kind) {
    case 'text':
      client.stdout.write(action.text);
      break;
    case 'tool':
      client.stderr.write(`${chalk.dim(`› ${action.text}`)}\n`);
      break;
    case 'info':
      client.stderr.write(`${chalk.dim(action.text)}\n`);
      break;
    case 'warn':
      client.output.warn(action.text);
      break;
    case 'error':
      client.output.error(action.text);
      break;
    default:
      break;
  }
}

const PROMPT_DELAY_MS = 400;
const TIMEOUT = { timeout: true } as const;

/**
 * Streams one assistant turn (`GET …/stream?wire=2`): renders it, asks the
 * questions and approvals it pauses on (interactive) or stops there, and
 * reconnects from the last frame when the connection drops.
 */
export async function streamTurn(
  opts: TurnOptions,
  chatId: string,
  workflowRunId: string,
  { settledQuestionIds = [] }: { settledQuestionIds?: string[] } = {}
): Promise<TurnOutcome> {
  const { client } = opts;
  const renderer: ChatRenderer = createChatRenderer();
  const controller = new AbortController();
  const settled = new Set(settledQuestionIds);
  let cursor = 0;
  let unavailable = 0;
  let failures = 0;
  let stopping = false;
  let waitingAction: RenderAction | null = null;
  let spinning = !opts.json && Boolean(client.stderr.isTTY);

  if (spinning) {
    client.output.spinner('Thinking…', 0);
  }

  const stopSpinner = (): void => {
    if (spinning) {
      client.output.stopSpinner();
      spinning = false;
    }
  };

  const onSigint = (): void => {
    if (stopping) {
      process.exit(EXIT_STOPPED);
    }

    stopping = true;
    stopSpinner();
    client.stderr.write(`\n${chalk.dim('Stopping the turn… (Ctrl+C again to quit at once)')}\n`);
    void stopTurn(opts, chatId).finally(() => controller.abort());
  };

  process.on('SIGINT', onSigint);

  /** Prompts deferred until the stream goes quiet, so replayed parts that settle them are seen first. */
  const queue: RenderAction[] = [];

  const handleActions = (actions: RenderAction[]): 'finish' | null => {
    for (const action of actions) {
      if (action.kind === 'finish') {
        return 'finish';
      }

      if (action.kind === 'question' || action.kind === 'approval') {
        queue.push(action);
        continue;
      }

      if (!opts.json) {
        stopSpinner();
        writeAction(opts, action);
      }
    }

    return null;
  };

  const stillPending = (action: RenderAction): boolean =>
    action.kind === 'question'
      ? renderer.isQuestionPending(action.question.questionId) && !settled.has(action.question.questionId)
      : action.kind === 'approval' && renderer.isApprovalPending(action.approval.approvalId);

  /** Handles queued prompts; returns false when the turn has to wait on the user. */
  const drainQueue = async (): Promise<boolean> => {
    while (queue.length > 0) {
      const action = queue.shift() as RenderAction;

      if (!stillPending(action)) {
        continue;
      }

      stopSpinner();

      if (!opts.interactive) {
        waitingAction = action;

        return false;
      }

      if (action.kind === 'question') {
        settled.add(action.question.questionId);
        await answerQuestion(opts, chatId, action.question);
      } else if (action.kind === 'approval') {
        if ((await decideApproval(opts, action.approval)) === 'pending') {
          waitingAction = action;

          return false;
        }
      }
    }

    return true;
  };

  const finish = (outcome: TurnOutcome): TurnOutcome => {
    stopSpinner();

    if (!opts.json) {
      for (const action of renderer.flush()) {
        writeAction(opts, action);
      }
    }

    if (outcome === 'waiting' && waitingAction && !opts.json) {
      printWaitingHint(opts, chatId, waitingAction);
    }

    if (outcome === 'stopped' && !opts.json) {
      client.output.log('Stopped.');
    }

    return outcome;
  };

  try {
    while (!controller.signal.aborted) {
      let response: Response;

      try {
        response = await client.rawFetch(
          `${chatPath(chatId)}/stream?workflowRunId=${encodeURIComponent(workflowRunId)}&wire=2&startIndex=${cursor}`,
          { projectId: opts.projectId, signal: controller.signal }
        );
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          break;
        }

        if (++failures >= 5) {
          throw err;
        }

        await sleep(1000 * failures);
        continue;
      }

      if (response.status === 404) {
        await response.body?.cancel().catch(() => undefined);

        // The workflow run may not exist for a moment after the turn starts.
        if (++unavailable <= 20) {
          await sleep(500);
          continue;
        }

        throw new Error(
          `The live output of this turn is no longer available. Run ${getCommandName(`chat show ${chatId}`)} to read the reply.`
        );
      }

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };

        if (response.status === 401 || response.status === 403 || ++failures >= 5) {
          throw new Error(data.error ?? `Streaming the reply failed (${response.status}).`);
        }

        await sleep(1000 * failures);
        continue;
      }

      if (response.headers.get('x-flexkit-stream-version') !== '2') {
        await response.body?.cancel().catch(() => undefined);
        throw new Error('This Flexkit server cannot stream chat replies to the CLI yet.');
      }

      const events = readEventStream(response);
      let next: Promise<IteratorResult<ServerSentEvent>> | null = null;

      for (;;) {
        next ??= events.next();
        const result: IteratorResult<ServerSentEvent> | typeof TIMEOUT =
          queue.length > 0
            ? await Promise.race([next, sleep(PROMPT_DELAY_MS).then((): typeof TIMEOUT => TIMEOUT)])
            : await next;

        if ('timeout' in result) {
          if (!(await drainQueue())) {
            await events.return(undefined).catch(() => undefined);
            controller.abort();

            return finish('waiting');
          }

          continue;
        }

        next = null;

        if (result.done) {
          break;
        }

        const frame = parseEventJson<{ index: number; chunk: ChatChunk | null }>(result.value);

        if (!frame || !Number.isSafeInteger(frame.index) || frame.index < cursor) {
          continue;
        }

        cursor = frame.index + 1;
        failures = 0;

        if (!frame.chunk) {
          continue;
        }

        if (opts.json) {
          client.stdout.write(`${shortJson(frame.chunk)}\n`);
        }

        if (handleActions(renderer.push(frame.chunk)) === 'finish') {
          if (!(await drainQueue())) {
            return finish('waiting');
          }

          if (stopping) {
            return finish('stopped');
          }

          return finish(renderer.failed() ? 'failed' : 'finished');
        }
      }

      if (stopping || controller.signal.aborted) {
        break;
      }

      if (!(await drainQueue())) {
        return finish('waiting');
      }

      // The connection ended before the terminal frame: settle or reconnect.
      const status = await getChatStatus(opts, chatId);
      const latest = status.latestMessage;

      if (latest && latest.workflowRunId === workflowRunId && TERMINAL_MESSAGE_STATUSES.includes(latest.status)) {
        return finish(latest.status === 'failed' || renderer.failed() ? 'failed' : 'finished');
      }

      await sleep(1000);
    }

    return finish('stopped');
  } catch (err: unknown) {
    stopSpinner();

    if (stopping && (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError'))) {
      return finish('stopped');
    }

    throw err;
  } finally {
    process.off('SIGINT', onSigint);
  }
}

/** Starts the turn a queued follow-up waits for, retrying while the previous turn settles. */
async function startQueued(opts: TurnOptions, chatId: string, messageId: string): Promise<ChatTurn> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await opts.client.fetch<ChatTurn>(
        `${chatPath(chatId)}/follow-ups/${encodeURIComponent(messageId)}/start`,
        { projectId: opts.projectId, method: 'POST' }
      );
    } catch (err: unknown) {
      if (isAPIError(err) && err.status === 409 && attempt < 15) {
        await sleep(1000);
        continue;
      }

      throw err;
    }
  }
}

function printTurnStart(opts: TurnOptions, chatId: string, turn: ChatTurn): void {
  if (opts.json) {
    opts.client.stdout.write(
      `${shortJson({
        type: 'flexkit-turn',
        chatId,
        workflowRunId: turn.workflowRunId,
        userMessageId: turn.userMessage.id,
        assistantMessageId: turn.assistantMessage.id,
      })}\n`
    );
  }
}

/**
 * Sends `content` (to a new chat when `chatId` is null) and streams the reply.
 * Returns the chat id and how the turn ended.
 */
export async function runPromptTurn(
  opts: TurnOptions,
  chatId: string | null,
  content: string
): Promise<{ chatId: string; outcome: TurnOutcome }> {
  const { client } = opts;

  if (!chatId) {
    if (!opts.json && client.stderr.isTTY) {
      client.output.spinner('Starting a chat…', 0);
    }

    const { chat, turn } = await startChat(opts, content);

    client.output.stopSpinner();
    printTurnStart(opts, chat.id, turn);

    return { chatId: chat.id, outcome: await streamTurn(opts, chat.id, turn.workflowRunId) };
  }

  const result = await sendFollowUp(opts, chatId, content);

  if ('turn' in result) {
    printTurnStart(opts, chatId, result.turn);

    return { chatId, outcome: await streamTurn(opts, chatId, result.turn.workflowRunId) };
  }

  // A turn is running: the message answered its question, steers it, or waits as the next turn.
  const status = await getChatStatus(opts, chatId);
  const running = status.latestMessage?.workflowRunId ?? null;
  const settledQuestionIds = 'question' in result ? [result.question.id] : [];

  if ('question' in result && !opts.json) {
    client.output.log('Your message answered the question the agent was waiting on.');
  }

  if ('followUp' in result && !opts.json) {
    client.output.log(
      result.followUp.delivery === 'steer'
        ? 'The agent is still working; your message joins the running turn.'
        : 'The agent is still working; your message runs as soon as the current turn ends.'
    );
  }

  let outcome: TurnOutcome = 'finished';

  if (running) {
    outcome = await streamTurn(opts, chatId, running, { settledQuestionIds });
  }

  if ('followUp' in result && result.followUp.delivery === 'queue' && outcome === 'finished') {
    const turn = await startQueued(opts, chatId, result.followUp.message.id);

    printTurnStart(opts, chatId, turn);
    outcome = await streamTurn(opts, chatId, turn.workflowRunId);
  }

  return { chatId, outcome };
}

export function outcomeExitCode(outcome: TurnOutcome): number {
  switch (outcome) {
    case 'finished':
      return 0;
    case 'waiting':
      return EXIT_WAITING;
    case 'stopped':
      return EXIT_STOPPED;
    default:
      return 1;
  }
}
