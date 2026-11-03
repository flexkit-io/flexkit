/**
 * Pure helpers for `flexkit chat`: turning the agent's streamed UI chunks into
 * terminal output, formatting a stored transcript and deciding whether the
 * first argument is a subcommand or a prompt. No I/O happens here.
 */

/** One UI message chunk of the chat stream (`text-delta`, `tool-input-available`, `data-*`, `finish`, …). */
export interface ChatChunk {
  type: string;
  [key: string]: unknown;
}

/** One multiple-choice question of an Ask User Question part. */
export interface ChatQuestionItem {
  header: string;
  multiSelect: boolean;
  options: { description: string; label: string }[];
  question: string;
}

/** `data-user-question` payload. */
export interface ChatQuestionData {
  answers?: { other?: string; selected: string[] }[];
  message?: string;
  questionId: string;
  questions: ChatQuestionItem[];
  status: 'pending' | 'answered' | 'dismissed' | 'expired' | 'cancelled';
}

/** `data-mutation-approval` payload. */
export interface ChatApprovalData {
  affectedCount?: number | null;
  approvalId: string;
  decidedBy?: string;
  error?: { message: string };
  operationsSummary: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'executed' | 'error';
}

/**
 * What to do with a chunk: `text` goes to stdout, `tool`/`info`/`warn`/`error`
 * to stderr, `question`/`approval` ask the user, `finish` ends the turn.
 */
export type RenderAction =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; text: string }
  | { kind: 'info'; text: string }
  | { kind: 'warn'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'question'; question: ChatQuestionData }
  | { kind: 'approval'; approval: ChatApprovalData }
  | { kind: 'finish'; aborted: boolean };

export interface ChatRenderer {
  push: (chunk: ChatChunk) => RenderAction[];
  /** Emits buffered text and a final newline; call when the turn ends. */
  flush: () => RenderAction[];
  /** Whether the question is still waiting according to the latest part seen. */
  isQuestionPending: (questionId: string) => boolean;
  /** Whether the approval is still waiting according to the latest part seen. */
  isApprovalPending: (approvalId: string) => boolean;
  /** True once the stream reported an error for this turn. */
  failed: () => boolean;
}

const SPEC_FENCE_OPEN = '```spec';
const SPEC_FENCE_CLOSE = '```';
export const SPEC_NOTICE = 'The agent drew an interactive view here; open this chat in Studio to see it.';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** A one-line preview of a tool input, e.g. `{"query":"{ products { name } }"}`. */
export function previewToolInput(input: unknown, max = 80): string {
  if (input === undefined || input === null) {
    return '';
  }

  let text: string;

  try {
    text = typeof input === 'string' ? input : JSON.stringify(input);
  } catch {
    return '';
  }

  if (!text || text === '{}') {
    return '';
  }

  const singleLine = text.replace(/\s+/g, ' ').trim();

  return singleLine.length > max ? `${singleLine.slice(0, max - 1)}…` : singleLine;
}

/** Removes ```spec fences (json-render views) from a finished text, leaving a notice in their place. */
export function stripSpecFences(text: string): string {
  const out: string[] = [];
  let inFence = false;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();

    if (!inFence && trimmed.startsWith(SPEC_FENCE_OPEN)) {
      inFence = true;
      out.push(`[${SPEC_NOTICE}]`);
      continue;
    }

    if (inFence) {
      if (trimmed === SPEC_FENCE_CLOSE) {
        inFence = false;
      }

      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

export function createChatRenderer(): ChatRenderer {
  const toolNames = new Map<string, string>();
  const questionStatus = new Map<string, string>();
  const approvalStatus = new Map<string, string>();
  const reportedArtifacts = new Set<string>();
  let pending = '';
  let inFence = false;
  let atLineStart = true;
  let wroteText = false;
  let blockEnded = false;
  let failed = false;

  /** Text written to stdout that does not end with a newline yet. */
  let openLine = false;

  const text = (value: string): RenderAction[] => {
    if (!value) {
      return [];
    }

    openLine = !value.endsWith('\n');
    wroteText = true;

    return [{ kind: 'text', text: value }];
  };

  /** Ends an open stdout line before something is printed on stderr. */
  const breakLine = (): RenderAction[] => {
    if (!openLine) {
      return [];
    }

    openLine = false;
    atLineStart = true;

    return [{ kind: 'text', text: '\n' }];
  };

  const side = (action: RenderAction): RenderAction[] => [...breakLine(), action];

  const writeDelta = (delta: string): RenderAction[] => {
    const actions: RenderAction[] = [];
    let rest = pending + delta;
    let out = '';

    pending = '';

    while (rest) {
      const newline = rest.indexOf('\n');
      const line = newline === -1 ? rest : rest.slice(0, newline);

      if (inFence) {
        if (newline === -1) {
          pending = rest;
          break;
        }

        if (line.trim() === SPEC_FENCE_CLOSE) {
          inFence = false;
        }

        rest = rest.slice(newline + 1);
        atLineStart = true;
        continue;
      }

      if (atLineStart) {
        const start = line.trimStart();

        if (newline === -1 && (SPEC_FENCE_OPEN.startsWith(start) || start.startsWith(SPEC_FENCE_OPEN))) {
          // Might still become a ```spec fence: wait for more of the line.
          pending = rest;
          break;
        }

        if (start.startsWith(SPEC_FENCE_OPEN)) {
          actions.push(...text(out));
          out = '';
          actions.push(...side({ kind: 'info', text: SPEC_NOTICE }));
          inFence = true;
          rest = rest.slice(newline + 1);
          continue;
        }
      }

      if (newline === -1) {
        out += rest;
        atLineStart = false;
        rest = '';
      } else {
        out += rest.slice(0, newline + 1);
        rest = rest.slice(newline + 1);
        atLineStart = true;
      }
    }

    actions.push(...text(out));

    return actions;
  };

  const flushPending = (): RenderAction[] => {
    if (!pending || inFence) {
      pending = '';

      return [];
    }

    const value = pending;
    pending = '';
    atLineStart = value.endsWith('\n');

    return text(value);
  };

  const toolName = (chunk: ChatChunk): string =>
    asString(chunk.toolName) || toolNames.get(asString(chunk.toolCallId)) || 'tool';

  const handleData = (type: string, data: Record<string, unknown>): RenderAction[] => {
    switch (type) {
      case 'data-user-question': {
        const question = data as unknown as ChatQuestionData;
        const previous = questionStatus.get(question.questionId);

        questionStatus.set(question.questionId, question.status);

        if (question.status === 'pending' && previous === undefined) {
          return [...flushPending(), ...breakLine(), { kind: 'question', question }];
        }

        return [];
      }

      case 'data-mutation-approval': {
        const approval = data as unknown as ChatApprovalData;
        const previous = approvalStatus.get(approval.approvalId);

        approvalStatus.set(approval.approvalId, approval.status);

        if (approval.status === 'pending') {
          return previous === undefined ? [...flushPending(), ...breakLine(), { kind: 'approval', approval }] : [];
        }

        if (previous === approval.status) {
          return [];
        }

        if (approval.status === 'error') {
          return side({
            kind: 'error',
            text: `Change failed: ${approval.error?.message ?? approval.operationsSummary}`,
          });
        }

        return side({ kind: 'info', text: `Change ${approval.status}: ${approval.operationsSummary}` });
      }

      case 'data-run-artifact': {
        const url = asString(data.url);
        const filename = asString(data.filename);

        if (data.status === 'done' && url && !reportedArtifacts.has(url)) {
          reportedArtifacts.add(url);

          return side({ kind: 'info', text: `File ${filename}: ${url}` });
        }

        if (data.status === 'error') {
          return side({
            kind: 'error',
            text: `Could not create ${filename}: ${asString(asRecord(data.error).message)}`,
          });
        }

        return [];
      }

      case 'data-turn-error':
        failed = true;

        return side({ kind: 'error', text: asString(data.message) || 'The turn failed.' });

      case 'data-plugin-connection':
        return side({
          kind: 'warn',
          text: `The agent needs the ${asString(data.pluginId)} plugin connected. Connect it in Studio (AI → Plugins), then continue the chat.`,
        });

      default:
        return [];
    }
  };

  return {
    push(chunk) {
      switch (chunk.type) {
        case 'text-start':
          if (wroteText && blockEnded) {
            blockEnded = false;

            return [...breakLine(), ...text('\n')];
          }

          return [];

        case 'text-delta':
          return writeDelta(asString(chunk.delta));

        case 'text-end':
          blockEnded = true;

          return flushPending();

        case 'tool-input-start':
          toolNames.set(asString(chunk.toolCallId), asString(chunk.toolName));

          return [];

        case 'tool-input-available': {
          const name = toolName(chunk);
          const preview = previewToolInput(chunk.input);

          return [...flushPending(), ...side({ kind: 'tool', text: preview ? `${name} ${preview}` : name })];
        }

        case 'tool-input-error':
        case 'tool-output-error':
          return [
            ...flushPending(),
            ...side({
              kind: 'error',
              text: `${toolName(chunk)} failed: ${asString(chunk.errorText) || 'unknown error'}`,
            }),
          ];

        case 'error':
          failed = true;

          return [...flushPending(), ...side({ kind: 'error', text: asString(chunk.errorText) || 'The turn failed.' })];

        case 'abort':
          return [
            ...flushPending(),
            ...side({ kind: 'warn', text: 'The turn was stopped.' }),
            { kind: 'finish', aborted: true },
          ];

        case 'finish':
          return [...flushPending(), ...breakLine(), { kind: 'finish', aborted: false }];

        default:
          if (chunk.type.startsWith('data-')) {
            return handleData(chunk.type, asRecord(chunk.data));
          }

          return [];
      }
    },
    flush() {
      return [...flushPending(), ...breakLine()];
    },
    isQuestionPending: (questionId) => questionStatus.get(questionId) === 'pending',
    isApprovalPending: (approvalId) => approvalStatus.get(approvalId) === 'pending',
    failed: () => failed,
  };
}

/** A stored chat message as `GET /agent/chats/:chatId` returns it. */
export interface ChatMessage {
  createdAt: string;
  error: string | null;
  id: string;
  kind?: string | null;
  parts: unknown;
  role: 'user' | 'assistant';
  status: string;
  textContent: string;
  workflowRunId: string | null;
}

export interface TranscriptStyle {
  heading: (text: string) => string;
  dim: (text: string) => string;
  error: (text: string) => string;
}

const plain: TranscriptStyle = { heading: (value) => value, dim: (value) => value, error: (value) => value };

/** Body lines of one stored message: its text, tool calls, files and questions. */
function messageLines(message: ChatMessage, style: TranscriptStyle): string[] {
  const lines: string[] = [];
  const parts = Array.isArray(message.parts) ? (message.parts as unknown[]).map(asRecord) : [];
  let sawText = false;

  for (const part of parts) {
    const type = asString(part.type);

    if (type === 'text') {
      const value = stripSpecFences(asString(part.text)).trim();

      if (value) {
        lines.push(value);
        sawText = true;
      }
    } else if (type.startsWith('tool-') && message.role === 'assistant') {
      const name = type.slice('tool-'.length);
      const preview = previewToolInput(part.input, 60);

      lines.push(style.dim(`› ${name}${preview ? ` ${preview}` : ''}`));

      if (part.state === 'output-error' && part.errorText) {
        lines.push(style.error(`  ${name} failed: ${asString(part.errorText)}`));
      }
    } else if (type === 'file') {
      lines.push(style.dim(`[attachment] ${asString(part.filename) || asString(part.url)}`));
    } else if (type === 'data-run-artifact') {
      const data = asRecord(part.data);

      if (data.url) {
        lines.push(style.dim(`[file] ${asString(data.filename)}: ${asString(data.url)}`));
      }
    } else if (type === 'data-user-question') {
      const data = asRecord(part.data) as unknown as ChatQuestionData;

      for (const item of data.questions ?? []) {
        lines.push(style.dim(`[question, ${data.status}] ${item.question}`));
      }
    } else if (type === 'data-mutation-approval') {
      const data = asRecord(part.data) as unknown as ChatApprovalData;

      lines.push(style.dim(`[change ${data.status}] ${data.operationsSummary} (${data.approvalId})`));
    } else if (type === 'data-turn-error') {
      lines.push(style.error(asString(asRecord(part.data).message)));
    }
  }

  if (!sawText && message.textContent.trim() && !parts.some((part) => part.type === 'text')) {
    lines.unshift(stripSpecFences(message.textContent).trim());
  }

  if (message.error) {
    lines.push(style.error(message.error));
  }

  return lines;
}

/** Formats a chat's messages as a readable transcript, oldest first. */
export function formatTranscript(
  messages: ChatMessage[],
  options: { now?: number; formatTime?: (value: string) => string; style?: TranscriptStyle } = {}
): string {
  const style = options.style ?? plain;
  const formatTime = options.formatTime ?? ((value: string) => value);
  const blocks: string[] = [];

  for (const message of messages) {
    let label = message.role === 'user' ? 'You' : 'Agent';

    if (message.kind === 'monitor_event') {
      label = 'Monitor';
    } else if (message.kind === 'plugin_connected') {
      label = 'Plugin connected';
    }

    const status = ['complete', 'pending'].includes(message.status) ? '' : ` · ${message.status}`;
    const heading = `${style.heading(label)} ${style.dim(`· ${formatTime(message.createdAt)}${status}`)}`;
    const body = messageLines(message, style);

    blocks.push([heading, ...body].join('\n'));
  }

  return blocks.join('\n\n');
}

/** How a chat subcommand's positionals look, so `flexkit chat show me the sales` stays a prompt. */
export interface ChatSubcommandShape {
  names: string[];
  /** `none`: no positionals (ls). `id`: exactly one chat id. `id+text`: a chat id and more words (rename). */
  args: 'none' | 'id' | 'id+text';
}

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Decides how `flexkit chat …` reads its positionals. The first one runs a
 * subcommand when it names one and the remaining words fit that subcommand
 * (`ls` alone, `show <chatId>`, `rename <chatId> <title>`), or when --help is
 * passed. Anything else, and everything after `--`, is the prompt.
 */
export function resolveChatMode(
  positionalsBeforeDash: string[],
  shapes: ChatSubcommandShape[],
  { help = false }: { help?: boolean } = {}
): { mode: 'subcommand'; name: string } | { mode: 'prompt' } {
  const [first, ...rest] = positionalsBeforeDash;
  const shape = first === undefined ? undefined : shapes.find((candidate) => candidate.names.includes(first));

  if (!shape || first === undefined) {
    return { mode: 'prompt' };
  }

  if (help) {
    return { mode: 'subcommand', name: first };
  }

  const startsWithId = rest[0] !== undefined && ID_PATTERN.test(rest[0]);
  const fits =
    (shape.args === 'none' && rest.length === 0) ||
    (shape.args === 'id' && rest.length === 1 && startsWithId) ||
    (shape.args === 'id+text' && rest.length >= 2 && startsWithId);

  return fits ? { mode: 'subcommand', name: first } : { mode: 'prompt' };
}

/** Joins the prompt words and the `--message` flag into one prompt, or explains the conflict. */
export function buildPrompt(
  words: string[],
  message: string | undefined
): { prompt: string | null } | { error: string } {
  if (message !== undefined && words.length > 0) {
    return { error: 'Pass the prompt either as arguments or with --message, not both.' };
  }

  if (message !== undefined) {
    return { prompt: message };
  }

  if (words.length === 0) {
    return { prompt: null };
  }

  return { prompt: words.join(' ') };
}

/** The answer body for one question set, from the labels picked and the text typed per question. */
export function toQuestionAnswers(
  picks: { selected: string[]; other?: string }[]
): { other?: string; selected: string[] }[] {
  return picks.map((pick) => {
    const other = pick.other?.trim();

    return other ? { other, selected: pick.selected } : { selected: pick.selected };
  });
}

/** Chat statuses after which a turn produces no more output. */
export const TERMINAL_MESSAGE_STATUSES = ['complete', 'failed'];
