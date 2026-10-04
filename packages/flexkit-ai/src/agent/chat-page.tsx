import type { JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, CopyIcon, CornerDownRightIcon, LoaderCircle, PencilIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import useSWR, { useSWRConfig } from 'swr';
import {
  Button,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputProvider,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  SpeechInput,
  SidebarTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  usePromptInputController,
} from '@flexkit/studio/ui';
import { fetcher, paths, type ApiClient } from '../api';
import {
  ChatApprovalContext,
  MessagePart,
  MutationApprovalPart,
  RunReplayActionsContext,
  STREAM_RETRY_DELAY_MS,
  ToolErrorLine,
  TurnStatusLine,
  getLiveStatusLabel,
  getMutationApprovalIds,
  isHiddenReplayPart,
  messageHasPendingMutationApproval,
  toMutationApprovalPartData,
  useProjectApi,
  useRunStream,
  useSessionMessages,
  type ReplayMessagePart,
  type RunRecordStatus,
  type RunReplayActions,
  type TurnStatus,
} from '../replay';
import type {
  AgentChat,
  AgentChatAttachment,
  AgentChatDetail,
  AgentChatMessage,
  AgentChatMessageStatus,
  AgentChatPart,
  AgentChatTurn,
  AutomationTools,
} from '../types';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENTS_MAX_PER_MESSAGE,
  ComposerAttachments,
  MessageAttachments,
  getAttachmentsFromParts,
  useAttachmentUploads,
} from './attachments';
import { useAgentBasePath } from './chat-list';
import { appendDictatedText } from './dictation';
import {
  AUTO_MODEL_KEY,
  coerceEffort,
  findModelByKey,
  formatModelSelection,
  getEffortOptions,
  getModelKey,
  parseModelSelection,
  type ModelSelection,
} from '../model-selection';

interface ToolsResponse {
  tools: AutomationTools;
}

/** Keep fetching an untitled chat after the first turn so the generated title can land. */
const TITLE_POLL_TIMEOUT_MS = 60_000;

function isActiveTurnStatus(status: AgentChatMessageStatus): boolean {
  return status === 'pending' || status === 'streaming' || status === 'awaiting_approval';
}

function getChatDetailRefreshInterval(latestData: AgentChatDetail | undefined): number {
  if (!latestData) {
    return 0;
  }

  const lastMessage = latestData.messages[latestData.messages.length - 1];

  if (lastMessage && lastMessage.role === 'assistant' && isActiveTurnStatus(lastMessage.status)) {
    return STREAM_RETRY_DELAY_MS;
  }

  if (latestData.chat.title?.trim()) {
    return 0;
  }

  const hasCompletedAssistant = latestData.messages.some(
    (message) => message.role === 'assistant' && message.status === 'complete'
  );

  if (!hasCompletedAssistant) {
    return 0;
  }

  const lastActivity = new Date(latestData.chat.lastMessageAt ?? latestData.chat.updatedAt).getTime();

  if (Date.now() - lastActivity < TITLE_POLL_TIMEOUT_MS) {
    return STREAM_RETRY_DELAY_MS;
  }

  return 0;
}

function createFallbackChatDetail(chatId: string, modelId: string | null, timestamp: string): AgentChatDetail {
  return {
    chat: {
      createdAt: timestamp,
      id: chatId,
      lastMessageAt: timestamp,
      modelId,
      title: null,
      updatedAt: timestamp,
    },
    messages: [],
    pendingApproval: null,
  };
}

function getSeedBaseDetail(
  current: AgentChatDetail | undefined,
  createdChat: AgentChat | null,
  cachedDetail: AgentChatDetail | undefined,
  chatId: string,
  modelId: string | null,
  timestamp: string
): AgentChatDetail {
  if (current) {
    return current;
  }

  if (createdChat) {
    return { chat: createdChat, messages: [], pendingApproval: null };
  }

  if (cachedDetail) {
    return cachedDetail;
  }

  return createFallbackChatDetail(chatId, modelId, timestamp);
}

/** Keep locally confirmed turns when a stale in-flight GET wins the SWR write. */
function mergeChatDetail(
  current: AgentChatDetail | undefined,
  incoming: AgentChatDetail | undefined
): AgentChatDetail | undefined {
  if (!incoming) {
    return current;
  }

  if (!current) {
    return incoming;
  }

  const incomingIds = new Set(incoming.messages.map((message) => message.id));
  const retained = current.messages.filter((message) => !incomingIds.has(message.id));

  if (retained.length === 0) {
    return incoming;
  }

  return {
    ...incoming,
    messages: [...incoming.messages, ...retained],
  };
}

function appendTurnToDetail(detail: AgentChatDetail, turn: AgentChatTurn): AgentChatDetail {
  const turnIds = new Set([turn.userMessage.id, turn.assistantMessage.id]);

  return {
    ...detail,
    messages: [
      ...detail.messages.filter((message) => !turnIds.has(message.id)),
      turn.userMessage,
      turn.assistantMessage,
    ],
  };
}

function resolveSeededChatDetail(
  seeds: { [chatId: string]: AgentChatDetail },
  chatId: string | undefined,
  detail: AgentChatDetail | undefined
): AgentChatDetail | undefined {
  if (!chatId) {
    return detail;
  }

  return mergeChatDetail(seeds[chatId], detail);
}

/** Maps a chat turn status onto the record statuses the stream hook understands. */
function getTurnRecordStatus(status: AgentChatMessageStatus): RunRecordStatus {
  if (status === 'awaiting_approval') {
    return 'awaiting_approval';
  }

  if (status === 'complete') {
    return 'success';
  }

  if (status === 'failed') {
    return 'failed';
  }

  return 'running';
}

function UserBubble({
  attachments = [],
  text,
}: {
  attachments?: AgentChatAttachment[];
  text: string;
}): JSX.Element {
  const { textInput } = usePromptInputController();
  const [copied, setCopied] = useState(false);
  const hasText = text.trim().length > 0;

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fk:group fk:ml-auto fk:flex fk:w-fit fk:max-w-[70%] fk:flex-col fk:items-end fk:gap-1">
      <MessageAttachments attachments={attachments} />
      {hasText ? (
        <div className="fk:whitespace-pre-wrap fk:rounded-xl fk:bg-muted fk:dark:bg-white/20 fk:px-3.5 fk:py-2 fk:text-base fk:corner-squircle">
          {text}
        </div>
      ) : null}
      <div
        className={
          hasText
            ? 'fk:flex fk:gap-0.5 fk:opacity-0 fk:transition-opacity fk:group-hover:opacity-100'
            : 'fk:hidden'
        }
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Copy prompt"
              className="fk:size-6 fk:text-muted-foreground"
              size="icon"
              variant="ghost"
              onClick={() => void handleCopy()}
            >
              {copied ? <CheckIcon className="fk:size-3.5" /> : <CopyIcon className="fk:size-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="Edit prompt"
              className="fk:size-6 fk:text-muted-foreground"
              size="icon"
              variant="ghost"
              onClick={() => textInput.setInput(text)}
            >
              <PencilIcon className="fk:size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/** The follow-up the turn offered, if the model was confident enough to offer one. */
function getSuggestedPrompt(parts: ReadonlyArray<{ data?: unknown; type: string }>): string | null {
  const part = parts.find((candidate) => candidate.type === 'data-suggested-prompt');
  const prompt = (part?.data as { prompt?: unknown } | undefined)?.prompt;

  return typeof prompt === 'string' && prompt.trim() ? prompt : null;
}

/**
 * One subtle chip under the latest reply. Clicking fills the composer and
 * nothing more: the user edits or sends it.
 */
function SuggestedPromptChip({ prompt }: { prompt: string }): JSX.Element {
  const { textInput } = usePromptInputController();

  return (
    <div className="fk:flex fk:justify-start">
      <button
        className="fk:inline-flex fk:max-w-full fk:items-center fk:gap-1.5 fk:rounded-full fk:border fk:border-border/70 fk:bg-muted/40 fk:px-3 fk:py-1.5 fk:text-left fk:text-sm fk:text-muted-foreground fk:transition-colors fk:hover:border-border fk:hover:bg-muted fk:hover:ext-foreground fk:corner-squircle"
        title="Use as your next message"
        type="button"
        onClick={() => textInput.setInput(prompt)}
      >
        <CornerDownRightIcon className="fk:size-3 fk:shrink-0" />
        <span className="fk:truncate">{prompt}</span>
      </button>
    </div>
  );
}

/**
 * Finished turns are stored as UIMessage-shaped parts. Reuse the live replay
 * renderer for `data-*` events (approvals, turn errors, tool status, artifacts,
 * specs) so history matches the in-flight `MessagePart` tree. `tool-*` parts
 * come from ModelMessage reconstruction and are ignored by `MessagePart`.
 */
function PersistedPart({
  api,
  part,
  partIndex,
  parts,
}: {
  api: ApiClient;
  part: AgentChatPart;
  partIndex: number;
  parts: AgentChatPart[];
}): JSX.Element | null {
  // The live stream never showed a card for these calls, so history does not
  // either. Only a failed call leaves a trace.
  if (part.type.startsWith('tool-')) {
    return part.state === 'output-error' ? <ToolErrorLine message={part.errorText ?? 'The tool call failed.'} /> : null;
  }

  return (
    <MessagePart
      api={api}
      part={part as ReplayMessagePart}
      partIndex={partIndex}
      parts={parts as ReplayMessagePart[]}
    />
  );
}

function HistoryMessage({
  api,
  message,
  showSuggestion = false,
}: {
  api: ApiClient;
  message: AgentChatMessage;
  /** Only the latest reply offers its follow-up; older ones would compete with it. */
  showSuggestion?: boolean;
}): JSX.Element | null {
  if (message.role === 'user') {
    return <UserBubble attachments={getAttachmentsFromParts(message.parts)} text={message.textContent} />;
  }

  // Reasoning stays persisted for debugging, but is never displayed in chat.
  // Rolling-status tool parts are only meaningful while the call is in flight.
  const parts = (Array.isArray(message.parts) ? message.parts : []).filter(
    (part) => !isHiddenReplayPart(part as ReplayMessagePart) && !(part.type.startsWith('tool-') && part.state !== 'output-error')
  );
  const hasTurnErrorPart = parts.some((part) => part.type === 'data-turn-error');
  const suggestedPrompt = showSuggestion && !message.error ? getSuggestedPrompt(parts) : null;

  if (parts.length === 0 && !message.error) {
    return null;
  }

  return (
    <div className="fk:w-full fk:min-w-0 fk:space-y-8">
      {parts.map((part, index) => (
        <PersistedPart
          api={api}
          key={part.toolCallId ?? `${message.id}-${index.toString()}`}
          part={part}
          partIndex={index}
          parts={parts}
        />
      ))}
      {message.error && !hasTurnErrorPart ? <ToolErrorLine message={message.error} /> : null}
      {suggestedPrompt ? <SuggestedPromptChip prompt={suggestedPrompt} /> : null}
    </div>
  );
}

/**
 * Streams the in-flight assistant turn from the workflow run stream, with the
 * same approval pause/resume handling as the automation run replay.
 */
function LiveTurn({
  api,
  chatId,
  detail,
  message,
  onStatusChange,
  onTurnUpdated,
}: {
  api: ApiClient;
  chatId: string;
  detail: AgentChatDetail;
  message: AgentChatMessage;
  onStatusChange: (_status: TurnStatus) => void;
  onTurnUpdated: () => void;
}): JSX.Element {
  const recordStatus = getTurnRecordStatus(message.status);
  const streamApi = message.workflowRunId ? api.getAgentChatStreamUrl(chatId, message.workflowRunId) : '';
  const [resumeToken, setResumeToken] = useState(0);
  const [suppressApprovalPause, setSuppressApprovalPause] = useState(false);
  const lastDecidedApprovalIdRef = useRef<string | null>(null);
  const { message: streamMessage, status } = useRunStream(streamApi, {
    recordStatus,
    resumeToken,
    suppressApprovalPause,
  });
  // Filter only the presentation copy, before session splitting, so a
  // reasoning-only message cannot leave an empty wrapper and extra spacing.
  const rawMessages = useMemo(
    () =>
      streamMessage ? [{ ...streamMessage, parts: streamMessage.parts.filter((part) => !isHiddenReplayPart(part)) }] : [],
    [streamMessage]
  );
  const sessionMessages = useSessionMessages(rawMessages);
  const onTurnUpdatedRef = useRef(onTurnUpdated);
  onTurnUpdatedRef.current = onTurnUpdated;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;
  const replayActions = useMemo<RunReplayActions>(
    () => ({
      onApprovalDecided: (approvalId) => {
        if (approvalId && lastDecidedApprovalIdRef.current === approvalId) {
          return;
        }

        if (approvalId) {
          lastDecidedApprovalIdRef.current = approvalId;
        }

        setSuppressApprovalPause(true);
        setResumeToken((current) => current + 1);
        onTurnUpdatedRef.current();
      },
    }),
    []
  );

  useEffect(() => {
    setResumeToken(0);
    setSuppressApprovalPause(false);
    lastDecidedApprovalIdRef.current = null;
  }, [message.id]);

  // Clear the post-decide suppress window once the workflow has resumed.
  useEffect(() => {
    if (suppressApprovalPause && message.status === 'streaming') {
      setSuppressApprovalPause(false);
    }
  }, [message.status, suppressApprovalPause]);

  useEffect(() => {
    if (status === 'finished' || status === 'paused') {
      onTurnUpdatedRef.current();
    }
  }, [status]);

  // Prefer the turn record over a stale pending stream part once execution
  // has resumed (`streaming`). Keeping the previous replay on reconnect can
  // leave a pending data-mutation-approval part in memory until rebuild.
  const isAwaitingApproval =
    !suppressApprovalPause &&
    message.status !== 'streaming' &&
    (message.status === 'awaiting_approval' || status === 'paused' || messageHasPendingMutationApproval(streamMessage));
  // When the stream replay has no data-mutation-approval part yet (e.g. right
  // after a reload), fall back to the pending approval from the chat detail.
  const streamApprovalIds = useMemo(() => new Set(getMutationApprovalIds(streamMessage)), [streamMessage]);
  const fallbackApproval =
    detail.pendingApproval && !streamApprovalIds.has(detail.pendingApproval.id) ? detail.pendingApproval : null;
  // Growing text shows its own progress, so the status line fades while the
  // response streams. Between steps it names the activity: the model's own
  // reasoning, a tool call ("Searching schema"), or plain "Thinking".
  const lastPart = streamMessage?.parts[streamMessage.parts.length - 1];
  const contentIsStreaming = lastPart?.type === 'text' && lastPart.state === 'streaming';
  const statusLabel = isAwaitingApproval ? 'Awaiting approval' : (getLiveStatusLabel(streamMessage) ?? 'Thinking');
  const statusVisible = isAwaitingApproval
    ? status !== 'finished' && status !== 'error'
    : status === 'streaming' && !contentIsStreaming;

  // The status line itself lives in ChatConversation so it keeps one stable
  // slot from "Sending" through the whole turn; LiveTurn only reports to it.
  useEffect(() => {
    onStatusChangeRef.current({ label: statusLabel, visible: statusVisible });
  }, [statusLabel, statusVisible]);

  const showFallbackApproval = Boolean(fallbackApproval) && isAwaitingApproval;
  const liveSuggestedPrompt =
    status === 'finished' ? getSuggestedPrompt(sessionMessages.flatMap((sessionMessage) => sessionMessage.parts)) : null;

  // Render no wrapper until there is content: an empty div still collects the
  // parent's vertical spacing and would shift the status line at mount.
  if (sessionMessages.length === 0 && !showFallbackApproval) {
    return <RunReplayActionsContext.Provider value={replayActions}>{null}</RunReplayActionsContext.Provider>;
  }

  return (
    <RunReplayActionsContext.Provider value={replayActions}>
      <div className="fk:w-full fk:min-w-0 fk:space-y-8">
        {sessionMessages.map((sessionMessage) => (
          <div className="fk:space-y-8 fk:min-w-0" key={sessionMessage.id}>
            {sessionMessage.parts.map((part, index) => (
              <MessagePart api={api} key={index} part={part} partIndex={index} parts={sessionMessage.parts} />
            ))}
          </div>
        ))}
        {fallbackApproval && showFallbackApproval ? (
          <MutationApprovalPart api={api} message={toMutationApprovalPartData(fallbackApproval)} />
        ) : null}
        {liveSuggestedPrompt ? <SuggestedPromptChip prompt={liveSuggestedPrompt} /> : null}
      </div>
    </RunReplayActionsContext.Provider>
  );
}

function ChatComposer({
  api,
  effort,
  modelKey,
  modelPending,
  models,
  onEffortChange,
  onError,
  onModelChange,
  onSend,
  onStop,
  sending,
  streaming,
}: {
  api: ApiClient;
  effort: string | null;
  modelKey: string | null;
  modelPending: boolean;
  models: AutomationTools['models'];
  onEffortChange: (_effort: string) => void;
  onError: (_message: string | null) => void;
  onModelChange: (_modelKey: string) => void;
  onSend: (_text: string, _attachments: AgentChatAttachment[]) => Promise<void>;
  onStop: () => Promise<void>;
  sending: boolean;
  streaming: boolean;
}): JSX.Element {
  const { attachments, textInput } = usePromptInputController();
  const uploads = useAttachmentUploads(api, onError);
  // `sending` only flips on the next render, so track the in-flight send
  // synchronously to reject a duplicate submit before it clears the text.
  const submittingRef = useRef(false);
  const selectableModels = models.filter((model) => !model.deprecated || getModelKey(model) === modelKey);
  const selectedModel = findModelByKey(models, modelKey);
  const effortOptions = getEffortOptions(selectedModel);
  const effectiveEffort = coerceEffort(selectedModel, effort);
  const status = streaming ? ('streaming' as const) : sending ? ('submitted' as const) : undefined;
  const isBusy = sending || streaming;
  const hasDraft = textInput.value.trim().length > 0 || attachments.files.length > 0;
  const canSubmit = hasDraft && !uploads.isUploading && !isBusy && !modelPending;

  return (
    <PromptInput
      accept={ATTACHMENT_ACCEPT}
      className="fk:mx-auto fk:max-w-4xl"
      maxFileSize={ATTACHMENT_MAX_BYTES}
      maxFiles={ATTACHMENTS_MAX_PER_MESSAGE}
      multiple
      onError={(error) => onError(error.message)}
      onSubmit={({ text }) => {
        const trimmed = text?.trim() ?? '';
        const sentAttachments = uploads.getUploaded(attachments.files.map((file) => file.id));

        // PromptInput clears the text and attachments whenever onSubmit returns
        // without throwing, so a blocked submit must reject to keep the draft.
        if (
          (!trimmed && sentAttachments.length === 0) ||
          uploads.isUploading ||
          isBusy ||
          submittingRef.current ||
          modelPending
        ) {
          return Promise.reject(new Error('The message cannot be sent right now.'));
        }

        // Clear the text immediately; restore it if sending fails. Returning
        // the promise makes PromptInput clear the attachments only once the
        // send resolved, so a failed send keeps the uploaded files attached.
        submittingRef.current = true;
        textInput.clear();

        return onSend(trimmed, sentAttachments)
          .catch((error: unknown) => {
            textInput.setInput(text);
            throw error;
          })
          .finally(() => {
            submittingRef.current = false;
          });
      }}
    >
      {attachments.files.length > 0 ? (
        // The header addon carries its own padding, so it is only mounted
        // while there is an attachment strip to show.
        <PromptInputHeader>
          <ComposerAttachments uploads={uploads} />
        </PromptInputHeader>
      ) : null}
      <PromptInputBody>
        <PromptInputTextarea disabled={isBusy} placeholder="Ask the agent anything about your project..." />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger aria-label="Add attachments" disabled={isBusy} tooltip="Add photos or files" />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          {selectableModels.length > 0 ? (
            <PromptInputSelect value={modelKey ?? undefined} onValueChange={onModelChange}>
              <PromptInputSelectTrigger aria-label="Model" className="fk:min-w-44">
                <PromptInputSelectValue placeholder="Model" />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {selectableModels.map((model) => (
                  <PromptInputSelectItem key={getModelKey(model)} value={getModelKey(model)}>
                    {model.name}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
          ) : null}
          {effortOptions.length > 1 && effectiveEffort ? (
            <PromptInputSelect value={effectiveEffort} onValueChange={onEffortChange}>
              <PromptInputSelectTrigger aria-label="Reasoning effort" className="fk:min-w-28">
                <PromptInputSelectValue placeholder="Effort" />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {effortOptions.map((option) => (
                  <PromptInputSelectItem key={option.value} value={option.value}>
                    {option.label}
                  </PromptInputSelectItem>
                ))}
              </PromptInputSelectContent>
            </PromptInputSelect>
          ) : null}
        </PromptInputTools>
        <div className="fk:flex fk:items-center fk:gap-3">
          <SpeechInput
            disabled={isBusy}
            onAudioRecorded={async (audioBlob, signal) => {
              const { text } = await api.transcribeAgentAudio(audioBlob, signal);

              return text;
            }}
            onError={(error) => onError(error.message)}
            onTranscriptionChange={(transcript) => {
              onError(null);
              textInput.setInput(appendDictatedText(textInput.value, transcript));
            }}
          />
          <PromptInputSubmit disabled={!isBusy && !canSubmit} status={status} onStop={() => void onStop()} />
        </div>
      </PromptInputFooter>
    </PromptInput>
  );
}

interface PendingMessage {
  attachments: AgentChatAttachment[];
  text: string;
}

function ChatConversation({
  api,
  chatId,
  projectId,
  pendingMessage,
  resolveDetail,
}: {
  api: ApiClient;
  /** Null while the first message of a new chat is being sent. */
  chatId: string | null;
  projectId: string;
  pendingMessage?: PendingMessage;
  resolveDetail: (_detail: AgentChatDetail | undefined) => AgentChatDetail | undefined;
}): JSX.Element {
  // SWR only re-arms its polling timer when the refreshInterval option (or
  // the key) changes. A module-level function has a stable identity, so the
  // timer was armed exactly once — at mount, with no data yet — where the
  // interval resolves to 0 and polling stays off forever. The chat then never
  // noticed a finished turn until a tab refocus revalidated it. The inline
  // arrow changes identity on every render, re-arming the timer whenever new
  // data (e.g. an active turn) arrives.
  const { data: rawDetail, mutate } = useSWR<AgentChatDetail>(
    chatId ? paths(projectId).agentChat(chatId) : null,
    fetcher,
    {
      refreshInterval: (latestData) => getChatDetailRefreshInterval(resolveDetail(latestData)),
    }
  );
  const data = resolveDetail(rawDetail);
  const messages = data?.messages ?? [];
  const lastMessage = messages[messages.length - 1];
  const liveMessage =
    lastMessage && lastMessage.role === 'assistant' && isActiveTurnStatus(lastMessage.status) ? lastMessage : null;
  const historyMessages = liveMessage ? messages.slice(0, -1) : messages;
  // Reported by LiveTurn; owned here so the status line keeps one stable slot
  // from "Sending" (no turn yet) through the live turn, rolling between labels
  // instead of remounting. Keyed by turn so a new turn never shows the
  // previous turn's last state.
  const [reportedStatus, setReportedStatus] = useState<{ messageId: string; status: TurnStatus } | null>(null);
  const liveStatus = liveMessage && reportedStatus?.messageId === liveMessage.id ? reportedStatus.status : null;

  if (chatId && !data && !pendingMessage) {
    return (
      <div className="fk:flex fk:flex-1 fk:items-center fk:justify-center fk:gap-2 fk:text-sm fk:text-muted-foreground">
        <LoaderCircle className="fk:size-4 fk:animate-spin" />
        Loading chat...
      </div>
    );
  }

  const turnActive = Boolean(pendingMessage) || Boolean(liveMessage);
  const latestAssistantId = [...historyMessages].reverse().find((message) => message.role === 'assistant')?.id ?? null;
  const statusLabel = liveMessage ? (liveStatus?.label ?? 'Thinking') : 'Sending';
  const statusVisible = liveMessage ? (liveStatus?.visible ?? true) : true;

  return (
    <Conversation className="fk:h-0 fk:min-h-0 fk:flex-1">
      <ConversationContent className="fk:gap-0 fk:p-0">
        <div className="fk:mx-auto fk:w-full fk:max-w-4xl fk:space-y-5 fk:pb-6 fk:pr-4">
          {historyMessages.map((message) => (
            <HistoryMessage
              api={api}
              key={message.id}
              message={message}
              showSuggestion={!turnActive && message.id === latestAssistantId}
            />
          ))}
          {liveMessage && chatId && data ? (
            <LiveTurn
              api={api}
              chatId={chatId}
              detail={data}
              message={liveMessage}
              onStatusChange={(status) => setReportedStatus({ messageId: liveMessage.id, status })}
              onTurnUpdated={() => void mutate()}
            />
          ) : null}
          {pendingMessage && !liveMessage ? (
            <UserBubble attachments={pendingMessage.attachments} text={pendingMessage.text} />
          ) : null}
          {turnActive ? <TurnStatusLine label={statusLabel} visible={statusVisible} /> : null}
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

const GENERIC_GREETINGS = [
  'Where should we begin?',
  'Ready when you are',
  'What’s on the agenda today?',
  'What’s on your mind today?',
];

function getNamedGreetings(name: string): string[] {
  return [`How can I help, ${name}?`, `Good to see you, ${name}.`, `Hey, ${name}. Ready to dive in?`];
}

function pickGreeting(preferredName: string | null): string {
  const greetings = preferredName ? [...GENERIC_GREETINGS, ...getNamedGreetings(preferredName)] : GENERIC_GREETINGS;

  return greetings[Math.floor(Math.random() * greetings.length)] ?? 'How can I help?';
}

const LAST_AGENT_MODEL_STORAGE_KEY = 'flexkit-ai:lastModelId';
const LAST_AGENT_EFFORT_STORAGE_KEY = 'flexkit-ai:lastEffort';

function readLastAgentModel(): ModelSelection | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(LAST_AGENT_MODEL_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    // The stored value is a model key, which on an older API is the composite
    // model id. Older builds also remembered whatever was last sent, which
    // predates Auto and explicit picks; the catalog lookup in `lastUsed` drops
    // any key it no longer lists, so a new chat starts on Auto in that case.
    return { effort: localStorage.getItem(LAST_AGENT_EFFORT_STORAGE_KEY), modelKey: stored };
  } catch {
    return null;
  }
}

function resolveComposerSelection(input: {
  awaitingChatModel: boolean;
  chatSelection: ModelSelection | null;
  defaultModelKey: string | null;
  lastUsed: ModelSelection | null;
  selectedEffort: string | null;
  selectedModelKey: string | null;
}): { effort: string | null; modelKey: string | null } {
  if (input.selectedModelKey) {
    return { effort: input.selectedEffort, modelKey: input.selectedModelKey };
  }

  // The chat detail request has not returned yet, so its model is unknown.
  // Falling through to the remembered model would display and send that one.
  if (input.awaitingChatModel) {
    return { effort: null, modelKey: null };
  }

  if (input.chatSelection) {
    return { effort: input.selectedEffort ?? input.chatSelection.effort, modelKey: input.chatSelection.modelKey };
  }

  if (input.lastUsed) {
    return { effort: input.selectedEffort ?? input.lastUsed.effort, modelKey: input.lastUsed.modelKey };
  }

  return { effort: input.selectedEffort, modelKey: input.defaultModelKey };
}

function writeLastAgentModel(selection: ModelSelection): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LAST_AGENT_MODEL_STORAGE_KEY, selection.modelKey);

    if (selection.effort) {
      localStorage.setItem(LAST_AGENT_EFFORT_STORAGE_KEY, selection.effort);
    } else {
      localStorage.removeItem(LAST_AGENT_EFFORT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors (private mode, blocked storage, etc.)
  }
}

function EmptyConversation({ projectId }: { projectId: string }): JSX.Element {
  const { data, isLoading } = useSWR<{ preferredName: string | null }>(paths(projectId).agentProfile(), fetcher);
  // Pick once the profile resolves so the greeting never flashes from a
  // generic salute to a personalized one.
  const greeting = useMemo(() => {
    if (isLoading) {
      return null;
    }

    return pickGreeting(data?.preferredName ?? null);
  }, [data, isLoading]);

  return (
    <div className="fk:flex fk:flex-1 fk:flex-col fk:items-center fk:justify-center fk:gap-3 fk:text-center">
      <h2 className="fk:text-2xl fk:font-semibold">{greeting ?? '\u00A0'}</h2>
      <p className="fk:max-w-md fk:text-sm fk:text-muted-foreground">
        Ask about your project data, run analyses, or propose changes. The agent works with your own role and space
        access, and every data change needs your approval.
      </p>
    </div>
  );
}

export function AgentChatPage(): JSX.Element {
  const { api, projectId } = useProjectApi();
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const agentBase = useAgentBasePath();
  const { mutate: globalMutate } = useSWRConfig();
  const { data: toolsData } = useSWR<ToolsResponse>(projectId ? paths(projectId).tools() : null, fetcher);
  const { data: rawChatDetail } = useSWR<AgentChatDetail>(
    projectId && chatId ? paths(projectId).agentChat(chatId) : null,
    fetcher
  );
  const seededDetailRef = useRef<{ [chatId: string]: AgentChatDetail }>({});

  function resolveDetail(detail: AgentChatDetail | undefined): AgentChatDetail | undefined {
    return resolveSeededChatDetail(seededDetailRef.current, chatId, detail);
  }

  const chatDetail = resolveDetail(rawChatDetail);
  const models = useMemo(() => toolsData?.tools.models ?? [], [toolsData]);
  const [selectedModelKey, setSelectedModelKey] = useState<string | null>(null);
  const [selectedEffort, setSelectedEffort] = useState<string | null>(null);
  // The chat's model id when Auto was last picked, so the selector only leaves
  // Auto once the chat reports a model the routed turn chose.
  const autoPickedOnModelIdRef = useRef<string | null>(null);
  const [rememberedModel, setRememberedModel] = useState<ModelSelection | null>(readLastAgentModel);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [pendingMessage, setPendingMessage] = useState<(PendingMessage & { chatId: string | undefined }) | null>(
    null
  );
  const visiblePendingMessage = pendingMessage && pendingMessage.chatId === chatId ? pendingMessage : undefined;
  const [sendError, setSendError] = useState<string | null>(null);
  const chatModelId = chatDetail?.chat.modelId ?? null;
  const awaitingChatModel = Boolean(chatId) && chatDetail === undefined;
  // A stored id the catalog no longer lists is kept as-is so the chat keeps sending it.
  const chatSelection = useMemo(
    () => parseModelSelection(chatModelId, models) ?? (chatModelId ? { effort: null, modelKey: chatModelId } : null),
    [chatModelId, models]
  );
  // The API lists Auto first, so a new chat starts on Auto.
  const defaultModelKey = useMemo(() => {
    const model = models.find((item) => !item.deprecated);

    return model ? getModelKey(model) : null;
  }, [models]);
  const lastUsed = useMemo(() => {
    const model = findModelByKey(models, rememberedModel?.modelKey ?? null);

    return rememberedModel && model && !model.deprecated ? rememberedModel : null;
  }, [models, rememberedModel]);
  const { effort, modelKey } = resolveComposerSelection({
    awaitingChatModel,
    chatSelection,
    defaultModelKey,
    lastUsed,
    selectedEffort,
    selectedModelKey,
  });
  const modelId = modelKey ? formatModelSelection({ effort, modelKey }, models) : null;
  const modelPending = awaitingChatModel && !selectedModelKey;

  useEffect(() => {
    autoPickedOnModelIdRef.current = null;
    setSelectedModelKey(null);
    setSelectedEffort(null);
    setSendError(null);
  }, [chatId]);

  // Auto resolves to a concrete model on the next routed turn and the chat
  // keeps it; once the chat reports that choice, the selector shows it
  // instead of staying on Auto. The chat's model at the time Auto was picked
  // is not that choice: an existing chat already reports its stored model, and
  // snapping back to it would make Auto impossible to pick for later turns.
  useEffect(() => {
    if (
      selectedModelKey === AUTO_MODEL_KEY &&
      chatModelId &&
      chatModelId !== AUTO_MODEL_KEY &&
      chatModelId !== autoPickedOnModelIdRef.current
    ) {
      setSelectedModelKey(null);
      setSelectedEffort(null);
    }
  }, [chatModelId, selectedModelKey]);

  function rememberModel(next: ModelSelection): void {
    setRememberedModel(next);
    writeLastAgentModel(next);
  }

  function handleModelChange(nextModelKey: string): void {
    autoPickedOnModelIdRef.current = nextModelKey === AUTO_MODEL_KEY ? chatModelId : null;
    setSelectedModelKey(nextModelKey);
    // The new model's default effort applies until the user picks one.
    setSelectedEffort(null);
    rememberModel({ effort: null, modelKey: nextModelKey });
  }

  function handleEffortChange(nextEffort: string): void {
    setSelectedEffort(nextEffort);

    if (modelKey) {
      rememberModel({ effort: nextEffort, modelKey });
    }
  }

  if (!projectId || !api) {
    return (
      <div className="fk:flex fk:h-full fk:items-center fk:justify-center fk:text-sm fk:text-muted-foreground">
        Select a project to chat with the agent.
      </div>
    );
  }

  const chatApi = api;
  const chatProjectId = projectId;
  const lastMessage = chatDetail?.messages[chatDetail.messages.length - 1];
  const turnInProgress = Boolean(
    lastMessage && lastMessage.role === 'assistant' && isActiveTurnStatus(lastMessage.status)
  );

  async function handleSend(text: string, attachments: AgentChatAttachment[]): Promise<void> {
    // Reject rather than resolve so the composer does not treat a duplicate
    // submit as a successful send and clear the attachments of the in-flight one.
    if (sendingRef.current) {
      throw new Error('A message is already being sent.');
    }

    if (modelPending) {
      throw new Error('This chat is still loading.');
    }

    sendingRef.current = true;
    setSending(true);
    setPendingMessage({ attachments, chatId, text });
    setSendError(null);

    // Only explicit picks in the selector are remembered (see handleModelChange);
    // what a chat happened to run on, including a routed Auto choice, is not.
    try {
      const chat = chatId ? null : (await chatApi.createAgentChat({ modelId })).chat;
      const targetChatId = chatId ?? chat!.id;
      const turn = await chatApi.sendAgentChatMessage(targetChatId, { attachments, content: text, modelId });

      // Seed the confirmed turn without waiting for another network round trip.
      // Keep a local overlay so an in-flight GET that started before POST cannot
      // replace this seed with a snapshot that omits the new messages.
      await globalMutate<AgentChatDetail>(
        paths(chatProjectId).agentChat(targetChatId),
        (current) => {
          const next = appendTurnToDetail(
            getSeedBaseDetail(
              mergeChatDetail(seededDetailRef.current[targetChatId], current),
              chat,
              rawChatDetail,
              targetChatId,
              modelId,
              turn.userMessage.createdAt
            ),
            turn
          );
          seededDetailRef.current[targetChatId] = next;

          return next;
        },
        { revalidate: false }
      );
      // Navigate before clearing the pending message so the conversation is
      // never left without a chat or a pending turn between the two updates.
      if (chat) {
        navigate(`${agentBase}/chats/${chat.id}`);
      }

      setPendingMessage(null);
    } catch (error) {
      setPendingMessage(null);
      setSendError(error instanceof Error ? error.message : 'Failed to send the message.');
      throw error;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function handleStop(): Promise<void> {
    if (!chatId) {
      return;
    }

    try {
      await chatApi.stopAgentChat(chatId);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to stop the turn.');
    } finally {
      await globalMutate(paths(chatProjectId).agentChat(chatId));
    }
  }

  return (
    <PromptInputProvider>
      <div className="fk:flex fk:h-full fk:min-h-0 fk:flex-col fk:gap-2">
        <div className="fk:mb-2 fk:flex fk:shrink-0 fk:items-start fk:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
            </TooltipTrigger>
            <TooltipContent>Toggle Sidebar</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
          <div className="fk:flex fk:flex-1 fk:items-center fk:gap-2">
            <h1 className="fk:truncate fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">
              {chatId ? (chatDetail?.chat.title?.trim() ?? 'Chat') : 'Agent'}
            </h1>
          </div>
        </div>
        <div className="fk:flex fk:min-h-0 fk:flex-1 fk:gap-4">
          <div className="fk:flex fk:min-h-0 fk:min-w-0 fk:flex-1 fk:flex-col fk:gap-3">
            {chatId || visiblePendingMessage ? (
              // One element type for the pending and the loaded chat, so the
              // status line survives the navigation after the chat is created.
              <ChatApprovalContext.Provider value>
                <ChatConversation
                  api={chatApi}
                  chatId={chatId ?? null}
                  pendingMessage={visiblePendingMessage}
                  projectId={projectId}
                  resolveDetail={resolveDetail}
                />
              </ChatApprovalContext.Provider>
            ) : (
              <EmptyConversation projectId={chatProjectId} />
            )}
            <div className="fk:shrink-0 fk:pb-3">
              {sendError ? (
                <p className="fk:mx-auto fk:mb-2 fk:max-w-4xl fk:text-xs fk:text-destructive">{sendError}</p>
              ) : null}
              <ChatComposer
                api={chatApi}
                effort={effort}
                modelKey={modelKey}
                modelPending={modelPending}
                models={models}
                sending={sending}
                streaming={turnInProgress}
                onEffortChange={handleEffortChange}
                onError={setSendError}
                onModelChange={handleModelChange}
                onSend={handleSend}
                onStop={handleStop}
              />
            </div>
          </div>
        </div>
      </div>
    </PromptInputProvider>
  );
}
