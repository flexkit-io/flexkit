import type { JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, CopyIcon, LoaderCircle, PencilIcon, XCircleIcon } from 'lucide-react';
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
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
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
  RollingStatusText,
  RunReplayActionsContext,
  STREAM_RETRY_DELAY_MS,
  getActiveRollingStatusLabel,
  getMutationApprovalIds,
  isRollingStatusPartType,
  messageHasPendingMutationApproval,
  toMutationApprovalPartData,
  useProjectApi,
  useRunStream,
  useSessionMessages,
  type ReplayMessagePart,
  type RunRecordStatus,
  type RunReplayActions,
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
        <div className="fk:whitespace-pre-wrap fk:rounded-xl fk:bg-muted fk:dark:bg-white/20 fk:px-3.5 fk:py-2 fk:text-base">
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
  if (part.type.startsWith('tool-')) {
    const state = (part.state === 'output-available' ? 'output-available' : 'input-available') as
      | 'output-available'
      | 'input-available';

    return (
      <Tool>
        <ToolHeader state={state} type={part.type as `tool-${string}`} />
        <ToolContent>
          <ToolInput input={part.input} />
          <ToolOutput errorText={part.errorText} output={part.output} />
        </ToolContent>
      </Tool>
    );
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

function HistoryMessage({ api, message }: { api: ApiClient; message: AgentChatMessage }): JSX.Element | null {
  if (message.role === 'user') {
    return <UserBubble attachments={getAttachmentsFromParts(message.parts)} text={message.textContent} />;
  }

  // Reasoning stays persisted for debugging, but is never displayed in chat.
  // Rolling-status tool parts are only meaningful while the call is in flight.
  const parts = (Array.isArray(message.parts) ? message.parts : []).filter(
    (part) => part.type !== 'reasoning' && part.type !== 'step-start' && !isRollingStatusPartType(part.type)
  );
  const hasTurnErrorPart = parts.some((part) => part.type === 'data-turn-error');

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
      {message.error && !hasTurnErrorPart ? (
        <div className="fk:flex fk:items-start fk:gap-2 fk:rounded-xl fk:border fk:border-red-700/40 fk:bg-destructive/5 fk:px-3.5 fk:py-3 fk:text-sm">
          <XCircleIcon className="fk:mt-0.5 fk:size-3.5 fk:shrink-0 fk:text-red-700" />
          <span className="fk:whitespace-pre-wrap fk:text-xs">{message.error}</span>
        </div>
      ) : null}
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
  onTurnUpdated,
}: {
  api: ApiClient;
  chatId: string;
  detail: AgentChatDetail;
  message: AgentChatMessage;
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
      streamMessage
        ? [{ ...streamMessage, parts: streamMessage.parts.filter((part) => part.type !== 'reasoning') }]
        : [],
    [streamMessage]
  );
  const sessionMessages = useSessionMessages(rawMessages);
  const onTurnUpdatedRef = useRef(onTurnUpdated);
  onTurnUpdatedRef.current = onTurnUpdated;
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
  // Growing text shows its own progress. Reasoning uses the same rolling
  // Thinking indicator as the gaps between tool calls, without a separate card.
  const lastPart = streamMessage?.parts[streamMessage.parts.length - 1];
  const contentIsStreaming = lastPart?.type === 'text' && lastPart.state === 'streaming';
  const showRunningSpinner = status === 'streaming' && !isAwaitingApproval && !contentIsStreaming;
  // While a tool call is in flight the indicator names the activity
  // ("Searching schema", ...) and rolls back to "Thinking..." once it ends.
  const activityLabel = getActiveRollingStatusLabel(streamMessage);

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
        {fallbackApproval && isAwaitingApproval ? (
          <MutationApprovalPart api={api} message={toMutationApprovalPartData(fallbackApproval)} />
        ) : null}
        {showRunningSpinner ? (
          <div className="fk:flex fk:items-center fk:gap-2 fk:py-2 fk:text-sm fk:text-muted-foreground">
            <RollingStatusText text={activityLabel ?? 'Thinking'} />
          </div>
        ) : null}
        {isAwaitingApproval && status !== 'finished' && status !== 'error' ? (
          <div className="fk:flex fk:items-center fk:gap-2 fk:py-2 fk:text-sm fk:text-muted-foreground">
            <LoaderCircle className="fk:size-4 fk:animate-spin" />
            <span>Awaiting approval...</span>
          </div>
        ) : null}
      </div>
    </RunReplayActionsContext.Provider>
  );
}

function ChatComposer({
  api,
  modelId,
  models,
  onError,
  onModelChange,
  onSend,
  onStop,
  sending,
  streaming,
}: {
  api: ApiClient;
  modelId: string | null;
  models: AutomationTools['models'];
  onError: (_message: string | null) => void;
  onModelChange: (_modelId: string) => void;
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
  const selectableModels = models.filter((model) => !model.deprecated || model.id === modelId);
  const status = streaming ? ('streaming' as const) : sending ? ('submitted' as const) : undefined;
  const isBusy = sending || streaming;
  const hasDraft = textInput.value.trim().length > 0 || attachments.files.length > 0;
  const canSubmit = hasDraft && !uploads.isUploading && !isBusy;

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
          submittingRef.current
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
      <PromptInputHeader>
        <ComposerAttachments uploads={uploads} />
      </PromptInputHeader>
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
            <PromptInputSelect value={modelId ?? undefined} onValueChange={onModelChange}>
              <PromptInputSelectTrigger className="fk:min-w-36">
                <PromptInputSelectValue placeholder="Model" />
              </PromptInputSelectTrigger>
              <PromptInputSelectContent>
                {selectableModels.map((model) => (
                  <PromptInputSelectItem key={model.id} value={model.id}>
                    {model.name}
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

function PendingChatMessage({ message }: { message: PendingMessage }): JSX.Element {
  return (
    <>
      <UserBubble attachments={message.attachments} text={message.text} />
      <div className="fk:flex fk:items-center fk:gap-2 fk:py-2 fk:text-sm fk:text-muted-foreground" role="status">
        <RollingStatusText text="Sending" />
      </div>
    </>
  );
}

function ChatConversation({
  api,
  chatId,
  projectId,
  pendingMessage,
  resolveDetail,
}: {
  api: ApiClient;
  chatId: string;
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
  const { data: rawDetail, mutate } = useSWR<AgentChatDetail>(paths(projectId).agentChat(chatId), fetcher, {
    refreshInterval: (latestData) => getChatDetailRefreshInterval(resolveDetail(latestData)),
  });
  const data = resolveDetail(rawDetail);

  if (!data && pendingMessage) {
    return (
      <Conversation className="fk:h-0 fk:min-h-0 fk:flex-1">
        <ConversationContent className="fk:gap-0 fk:p-0">
          <div className="fk:mx-auto fk:w-full fk:max-w-4xl fk:space-y-5 fk:pb-6 fk:pr-4">
            <PendingChatMessage message={pendingMessage} />
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    );
  }

  if (!data) {
    return (
      <div className="fk:flex fk:flex-1 fk:items-center fk:justify-center fk:gap-2 fk:text-sm fk:text-muted-foreground">
        <LoaderCircle className="fk:size-4 fk:animate-spin" />
        Loading chat...
      </div>
    );
  }

  const lastMessage = data.messages[data.messages.length - 1];
  const liveMessage =
    lastMessage && lastMessage.role === 'assistant' && isActiveTurnStatus(lastMessage.status) ? lastMessage : null;
  const historyMessages = liveMessage ? data.messages.slice(0, -1) : data.messages;

  return (
    <Conversation className="fk:h-0 fk:min-h-0 fk:flex-1">
      <ConversationContent className="fk:gap-0 fk:p-0">
        <div className="fk:mx-auto fk:w-full fk:max-w-4xl fk:space-y-5 fk:pb-6 fk:pr-4">
          {historyMessages.map((message) => (
            <HistoryMessage api={api} key={message.id} message={message} />
          ))}
          {liveMessage ? (
            <LiveTurn
              api={api}
              chatId={chatId}
              detail={data}
              message={liveMessage}
              onTurnUpdated={() => void mutate()}
            />
          ) : null}
          {pendingMessage ? <PendingChatMessage message={pendingMessage} /> : null}
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

function readLastAgentModelId(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(LAST_AGENT_MODEL_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    return stored;
  } catch {
    return null;
  }
}

function writeLastAgentModelId(modelId: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(LAST_AGENT_MODEL_STORAGE_KEY, modelId);
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
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [rememberedModelId, setRememberedModelId] = useState<string | null>(readLastAgentModelId);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [pendingMessage, setPendingMessage] = useState<(PendingMessage & { chatId: string | undefined }) | null>(
    null
  );
  const visiblePendingMessage = pendingMessage && pendingMessage.chatId === chatId ? pendingMessage : undefined;
  const [sendError, setSendError] = useState<string | null>(null);
  const chatModelId = chatDetail?.chat.modelId ?? null;
  const defaultModelId = useMemo(() => models.find((model) => !model.deprecated)?.id ?? null, [models]);
  const lastUsedModelId = useMemo(() => {
    if (!rememberedModelId) {
      return null;
    }

    const model = models.find((item) => item.id === rememberedModelId);

    if (!model || model.deprecated) {
      return null;
    }

    return rememberedModelId;
  }, [models, rememberedModelId]);
  const modelId = selectedModelId ?? chatModelId ?? lastUsedModelId ?? defaultModelId;

  useEffect(() => {
    setSelectedModelId(null);
    setSendError(null);
  }, [chatId]);

  function rememberModel(nextModelId: string): void {
    setRememberedModelId(nextModelId);
    writeLastAgentModelId(nextModelId);
  }

  function handleModelChange(nextModelId: string): void {
    setSelectedModelId(nextModelId);
    rememberModel(nextModelId);
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

    sendingRef.current = true;
    setSending(true);
    setPendingMessage({ attachments, chatId, text });
    setSendError(null);

    if (modelId) {
      rememberModel(modelId);
    }

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
      setPendingMessage(null);

      if (chat) {
        navigate(`${agentBase}/chats/${chat.id}`);
      }
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
            {chatId ? (
              <ChatApprovalContext.Provider value>
                <ChatConversation
                  api={chatApi}
                  chatId={chatId}
                  pendingMessage={visiblePendingMessage}
                  projectId={projectId}
                  resolveDetail={resolveDetail}
                />
              </ChatApprovalContext.Provider>
            ) : visiblePendingMessage ? (
              <Conversation className="fk:h-0 fk:min-h-0 fk:flex-1">
                <ConversationContent className="fk:gap-0 fk:p-0">
                  <div className="fk:mx-auto fk:w-full fk:max-w-4xl fk:space-y-5 fk:pb-6 fk:pr-4">
                    <PendingChatMessage message={visiblePendingMessage} />
                  </div>
                </ConversationContent>
              </Conversation>
            ) : (
              <EmptyConversation projectId={chatProjectId} />
            )}
            <div className="fk:shrink-0 fk:pb-3">
              {sendError ? (
                <p className="fk:mx-auto fk:mb-2 fk:max-w-4xl fk:text-xs fk:text-destructive">{sendError}</p>
              ) : null}
              <ChatComposer
                api={chatApi}
                modelId={modelId}
                models={models}
                sending={sending}
                streaming={turnInProgress}
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
