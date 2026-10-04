/**
 * Pure helpers behind the transient status line shown while an agent turn or
 * automation run is in flight. Kept free of React and UI imports so the
 * label heuristics can be unit-tested in isolation.
 */
import type { ReplayDataParts, ReplayMessage, ReplayMessagePart } from './replay';

export const STATUS_LABEL_MAX_LENGTH = 72;

export const JEV_APPROVAL_REASON_PREFIX = 'Approved by Flexkit Jev policy';
export const TOOL_ALLOW_RULE_REASON_PREFIX = 'Approved by automation tool allow rule';

const ROLLING_STATUS_PART_TYPES = new Set<string>([
  'data-create-sandbox',
  'data-execute-graphql',
  'data-load-skill',
  'data-plan',
  'data-plugin-call',
  'data-run-command',
  'data-search-schema',
  'data-update-memory',
  'data-validate-graphql',
  'data-web-search',
]);

/**
 * These tool events are surfaced as a single transient status line while the
 * call is in flight (see `RollingStatusText`) instead of persistent cards.
 */
export function isRollingStatusPartType(type: string): boolean {
  return ROLLING_STATUS_PART_TYPES.has(type);
}

export function getPartData<T>(part: ReplayMessagePart): T {
  return (part as { data: T }).data;
}

/** Plugin calls cleared without asking anyone (Jev or an allow rule): the replay shows nothing for them. */
export function isJevAutoApproved(message: ReplayDataParts['mutation-approval']): boolean {
  return (
    !message.decidedBy &&
    Boolean(
      message.reason?.startsWith(JEV_APPROVAL_REASON_PREFIX) || message.reason?.startsWith(TOOL_ALLOW_RULE_REASON_PREFIX)
    )
  );
}

export function truncateLabel(text: string, maxLength = STATUS_LABEL_MAX_LENGTH): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const cut = trimmed.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  const wordBoundary = lastSpace >= Math.floor(maxLength * 0.6) ? cut.slice(0, lastSpace) : cut;

  return `${wordBoundary.trimEnd()}…`;
}

export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '')
    .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.:]+$/, '');
}

/**
 * The prefix of a streaming reasoning text that will not change anymore: up to
 * the later of the last line break and the last sentence terminator followed
 * by whitespace. Empty when no boundary has been reached yet.
 */
export function getCommittedReasoningText(text: string): string {
  const lastNewline = text.lastIndexOf('\n');
  let lastSentence = -1;
  const sentenceEnd = /[.!?](?=\s)/g;
  let match: RegExpExecArray | null;

  while ((match = sentenceEnd.exec(text)) !== null) {
    lastSentence = match.index;
  }

  const boundary = Math.max(lastNewline, lastSentence);

  if (boundary < 0) {
    return '';
  }

  return text.slice(0, boundary + 1);
}

/**
 * One-line label for a reasoning part: the heading or first sentence of the
 * latest committed paragraph. Updates only at line/sentence boundaries so the
 * status line does not flicker on every token.
 */
export function getReasoningStatusLabel(text: string, options: { streaming: boolean }): string | null {
  const committed = options.streaming ? getCommittedReasoningText(text) : text;
  const lines = committed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const last = lines[lines.length - 1];

  if (!last) {
    return null;
  }

  const heading = /^\*\*(.+?)\*\*:?$/.exec(last)?.[1] ?? /^#{1,6}\s+(.+)$/.exec(last)?.[1];
  const candidate = heading ?? /^(.+?[.!?])(?:\s|$)/.exec(last)?.[1] ?? last;
  const plain = stripInlineMarkdown(candidate);

  if (!plain || /^reasoning$/i.test(plain)) {
    return null;
  }

  return truncateLabel(plain);
}

function humanizeToolName(tool: string): string {
  return tool.replace(/[_-]+/g, ' ').trim();
}

/** Gerund label for a rolling-status part, or null once the call concluded. */
export function getRollingStatusLabel(part: ReplayMessagePart): string | null {
  if (part.type === 'data-load-skill') {
    const data = getPartData<ReplayDataParts['load-skill']>(part);

    if (data.status !== 'loading') {
      return null;
    }

    return data.skillName ? truncateLabel(`Loading skill "${data.skillName}"`) : 'Loading skill';
  }

  if (part.type === 'data-search-schema') {
    const data = getPartData<ReplayDataParts['search-schema']>(part);

    return data.status === 'loading' ? 'Searching schema' : null;
  }

  if (part.type === 'data-validate-graphql') {
    const data = getPartData<ReplayDataParts['validate-graphql']>(part);

    return data.status === 'loading' ? 'Validating GraphQL query' : null;
  }

  if (part.type === 'data-execute-graphql') {
    const data = getPartData<ReplayDataParts['execute-graphql']>(part);

    if (data.status !== 'loading') {
      return null;
    }

    return data.operationType === 'mutation' ? 'Executing GraphQL mutation' : 'Executing GraphQL query';
  }

  if (part.type === 'data-update-memory') {
    const data = getPartData<ReplayDataParts['update-memory']>(part);

    return data.status === 'loading' ? 'Updating memory' : null;
  }

  if (part.type === 'data-web-search') {
    const data = getPartData<ReplayDataParts['web-search']>(part);

    if (data.status !== 'loading') {
      return null;
    }

    return data.query ? truncateLabel(`Searching the web for "${data.query}"`) : 'Searching the web';
  }

  if (part.type === 'data-run-command') {
    const data = getPartData<ReplayDataParts['run-command']>(part);

    if (!['executing', 'running', 'waiting'].includes(data.status)) {
      return null;
    }

    return truncateLabel(`Running ${[data.command, ...data.args].join(' ')}`);
  }

  if (part.type === 'data-create-sandbox') {
    const data = getPartData<ReplayDataParts['create-sandbox']>(part);

    return data.status === 'loading' ? 'Creating sandbox' : null;
  }

  if (part.type === 'data-plugin-call') {
    const data = getPartData<ReplayDataParts['plugin-call']>(part);

    if (data.status !== 'loading') {
      return null;
    }

    return truncateLabel(`Calling ${data.pluginId}: ${humanizeToolName(data.tool)}`);
  }

  if (part.type === 'data-subtask') {
    const data = getPartData<ReplayDataParts['subtask']>(part);

    return data.status === 'running' ? truncateLabel(`Running subtask: ${data.title}`) : null;
  }

  return null;
}

/** Error text for a failed rolling-status part, or null when it did not fail. */
/**
 * Schema lookups and GraphQL validation or query failures are the agent's own
 * missteps: it reads the error and corrects the next call. Showing them would
 * only tell the user about a problem they cannot act on.
 */
const AGENT_INTERNAL_ERROR_PART_TYPES = new Set<string>(['data-execute-graphql', 'data-search-schema', 'data-validate-graphql']);

export function getRollingStatusError(part: ReplayMessagePart): string | null {
  if (!isRollingStatusPartType(part.type) || part.type === 'data-plan' || AGENT_INTERNAL_ERROR_PART_TYPES.has(part.type)) {
    return null;
  }

  const data = getPartData<{ status: string; error?: { message?: string } } & { [key: string]: unknown }>(part);

  if (data.status !== 'error') {
    return null;
  }

  if (data.error?.message) {
    return data.error.message;
  }

  switch (part.type) {
    case 'data-web-search':
      return 'Failed to search the web';
    case 'data-run-command':
      return `Command failed: ${String(data.command ?? '')}`.trim();
    case 'data-create-sandbox':
      return 'Failed to create sandbox';
    case 'data-load-skill':
      return 'Failed to load skill';
    case 'data-update-memory':
      return 'Failed to update memory';
    case 'data-plugin-call':
      return `Plugin call failed: ${String(data.pluginId ?? '')}: ${humanizeToolName(String(data.tool ?? ''))}`;
    default:
      return 'The tool call failed';
  }
}

/**
 * Parts that never render in the conversation: they either feed the transient
 * status line, are internal bookkeeping, or were cleared without anyone being
 * asked. Failed calls stay visible so the user learns what went wrong.
 */
export function isHiddenReplayPart(part: ReplayMessagePart): boolean {
  if (part.type === 'step-start' || part.type === 'reasoning') {
    return true;
  }

  if (isRollingStatusPartType(part.type)) {
    return getRollingStatusError(part) === null;
  }

  if (part.type === 'data-mutation-approval') {
    const data = getPartData<ReplayDataParts['mutation-approval']>(part);

    return isJevAutoApproved(data) && data.status !== 'error';
  }

  return false;
}

/**
 * Label describing what the agent is doing right now, derived from the tail
 * of the stream: streaming reasoning, a pending approval, or an in-flight
 * tool call. Null when nothing specific is known (callers show "Thinking").
 */
/** "Step 2 of 5: Fetch threads" from the latest plan part, if one has an in-progress step. */
export function getPlanStatusLabel(message: ReplayMessage | undefined): string | null {
  if (!message) {
    return null;
  }

  for (let index = message.parts.length - 1; index >= 0; index--) {
    const part = message.parts[index];

    if (part?.type !== 'data-plan') {
      continue;
    }

    const data = getPartData<ReplayDataParts['plan']>(part);
    const current = data.steps.findIndex((step) => step.status === 'in_progress');

    if (current < 0) {
      return null;
    }

    return truncateLabel(`Step ${(current + 1).toString()} of ${data.steps.length.toString()}: ${data.steps[current]!.step}`);
  }

  return null;
}

export function getLiveStatusLabel(message: ReplayMessage | undefined): string | null {
  if (!message) {
    return null;
  }

  for (let index = message.parts.length - 1; index >= 0; index--) {
    const part = message.parts[index];

    if (!part || part.type === 'step-start') {
      continue;
    }

    if (part.type === 'reasoning') {
      if (part.state === 'streaming') {
        return getReasoningStatusLabel(part.text, { streaming: true }) ?? getPlanStatusLabel(message);
      }

      return getPlanStatusLabel(message);
    }

    if (part.type === 'data-mutation-approval') {
      const data = getPartData<ReplayDataParts['mutation-approval']>(part);

      return data.status === 'pending' ? 'Awaiting approval' : getPlanStatusLabel(message);
    }

    if (part.type === 'text') {
      return null;
    }

    // A tool label beats the plan step while the tool runs; the plan fills the gaps.
    return getRollingStatusLabel(part) ?? getPlanStatusLabel(message);
  }

  return null;
}
