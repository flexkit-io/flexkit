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
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
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
  MessagePart,
  MutationApprovalPart,
  RunReplayActionsContext,
  STREAM_RETRY_DELAY_MS,
  getMutationApprovalIds,
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
  AgentChatDetail,
  AgentChatMessage,
  AgentChatMessageStatus,
  AgentChatPart,
  AutomationTools,
} from '../types';
import { useAgentBasePath } from './chat-list';

interface ToolsResponse {
  tools: AutomationTools;
}

function isActiveTurnStatus(status: AgentChatMessageStatus): boolean {
  return status === 'pending' || status === 'streaming' || status === 'awaiting_approval';
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

function UserBubble({ text }: { text: string }): JSX.Element {
  const { textInput } = usePromptInputController();
  const [copied, setCopied] = useState(false);

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fk:group fk:ml-auto fk:flex fk:w-fit fk:max-w-[70%] fk:flex-col fk:items-end fk:gap-1">
      <div className="fk:whitespace-pre-wrap fk:rounded-xl fk:bg-secondary fk:px-4 fk:py-3 fk:text-sm">{text}</div>
      <div className="fk:flex fk:gap-0.5 fk:opacity-0 fk:transition-opacity fk:group-hover:opacity-100">
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
    return <UserBubble text={message.textContent} />;
  }

  const parts = Array.isArray(message.parts) ? message.parts : [];
  const hasTurnErrorPart = parts.some((part) => part.type === 'data-turn-error');

  if (parts.length === 0 && !message.error) {
    return null;
  }

  return (
    <div className="fk:w-full fk:min-w-0 fk:space-y-3">
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
  const rawMessages = useMemo(() => (streamMessage ? [streamMessage] : []), [streamMessage]);
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

  const isAwaitingApproval =
    !suppressApprovalPause &&
    (message.status === 'awaiting_approval' || status === 'paused' || messageHasPendingMutationApproval(streamMessage));
  // When the stream replay has no data-mutation-approval part yet (e.g. right
  // after a reload), fall back to the pending approval from the chat detail.
  const streamApprovalIds = useMemo(() => new Set(getMutationApprovalIds(streamMessage)), [streamMessage]);
  const fallbackApproval =
    detail.pendingApproval && !streamApprovalIds.has(detail.pendingApproval.id) ? detail.pendingApproval : null;
  // While a reasoning or text part is actively streaming, that part already
  // shows its own progress ("Reasoning..." / the growing text), so the
  // generic "Thinking..." indicator would double up.
  const lastSessionMessage = sessionMessages[sessionMessages.length - 1];
  const lastPart = lastSessionMessage?.parts[lastSessionMessage.parts.length - 1];
  const contentIsStreaming = Boolean(
    lastPart && (lastPart.type === 'reasoning' || lastPart.type === 'text') && lastPart.state === 'streaming'
  );
  const showRunningSpinner = status === 'streaming' && !isAwaitingApproval && !contentIsStreaming;

  return (
    <RunReplayActionsContext.Provider value={replayActions}>
      <div className="fk:w-full fk:min-w-0 fk:space-y-3">
        {sessionMessages.map((sessionMessage) => (
          <div className="fk:space-y-3 fk:min-w-0" key={sessionMessage.id}>
            {sessionMessage.parts.map((part, index) => (
              <MessagePart api={api} key={index} part={part} partIndex={index} parts={sessionMessage.parts} />
            ))}
          </div>
        ))}
        {fallbackApproval && isAwaitingApproval ? (
          <MutationApprovalPart api={api} message={toMutationApprovalPartData(fallbackApproval)} />
        ) : null}
        {showRunningSpinner ? (
          <div className="fk:flex fk:items-center fk:shimmer fk:shimmer-duration-1000 fk:gap-2 fk:py-2 fk:font-mono fk:text-sm fk:text-muted-foreground">
            Thinking...
          </div>
        ) : null}
        {isAwaitingApproval && status !== 'finished' && status !== 'error' ? (
          <div className="fk:flex fk:items-center fk:gap-2 fk:py-2 fk:font-mono fk:text-sm fk:text-muted-foreground">
            <LoaderCircle className="fk:size-4 fk:animate-spin" />
            <span>Awaiting approval...</span>
          </div>
        ) : null}
      </div>
    </RunReplayActionsContext.Provider>
  );
}

function ChatComposer({
  modelId,
  models,
  onModelChange,
  onSend,
  onStop,
  sending,
  streaming,
}: {
  modelId: string | null;
  models: AutomationTools['models'];
  onModelChange: (_modelId: string) => void;
  onSend: (_text: string) => Promise<void>;
  onStop: () => Promise<void>;
  sending: boolean;
  streaming: boolean;
}): JSX.Element {
  const selectableModels = models.filter((model) => !model.deprecated || model.id === modelId);
  const status = streaming ? ('streaming' as const) : sending ? ('submitted' as const) : undefined;

  return (
    <PromptInput
      className="fk:mx-auto fk:max-w-3xl"
      onSubmit={async ({ text }) => {
        const trimmed = text?.trim();

        if (!trimmed || sending || streaming) {
          return;
        }

        await onSend(trimmed);
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea disabled={streaming} placeholder="Ask the agent anything about your project..." />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
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
        <PromptInputSubmit status={status} onStop={() => void onStop()} />
      </PromptInputFooter>
    </PromptInput>
  );
}

function ChatConversation({
  api,
  chatId,
  projectId,
}: {
  api: ApiClient;
  chatId: string;
  projectId: string;
}): JSX.Element {
  const { data, mutate } = useSWR<AgentChatDetail>(paths(projectId).agentChat(chatId), fetcher, {
    refreshInterval: (latestData) => {
      const lastMessage = latestData?.messages[latestData.messages.length - 1];

      if (lastMessage && lastMessage.role === 'assistant' && isActiveTurnStatus(lastMessage.status)) {
        return STREAM_RETRY_DELAY_MS;
      }

      return 0;
    },
  });

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
        <div className="fk:mx-auto fk:w-full fk:max-w-3xl fk:space-y-5 fk:pb-6 fk:pr-4">
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
  const { data: chatDetail } = useSWR<AgentChatDetail>(
    projectId && chatId ? paths(projectId).agentChat(chatId) : null,
    fetcher
  );
  const models = useMemo(() => toolsData?.tools.models ?? [], [toolsData]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const chatModelId = chatDetail?.chat.modelId ?? null;
  const defaultModelId = useMemo(() => models.find((model) => !model.deprecated)?.id ?? null, [models]);
  const modelId = selectedModelId ?? chatModelId ?? defaultModelId;

  useEffect(() => {
    setSelectedModelId(null);
    setSendError(null);
  }, [chatId]);

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

  async function handleSend(text: string): Promise<void> {
    setSending(true);
    setSendError(null);

    try {
      if (chatId) {
        await chatApi.sendAgentChatMessage(chatId, { content: text, modelId });
        // The idle detail SWR does not poll; revalidate so the new turn shows up.
        await globalMutate(paths(chatProjectId).agentChat(chatId));

        return;
      }

      const { chat } = await chatApi.createAgentChat({ modelId });

      await chatApi.sendAgentChatMessage(chat.id, { content: text, modelId });
      navigate(`${agentBase}/chats/${chat.id}`);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Failed to send the message.');
    } finally {
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
              <ChatConversation api={chatApi} chatId={chatId} projectId={projectId} />
            ) : (
              <EmptyConversation projectId={chatProjectId} />
            )}
            <div className="fk:shrink-0 fk:pb-3">
              {sendError ? (
                <p className="fk:mx-auto fk:mb-2 fk:max-w-3xl fk:text-xs fk:text-destructive">{sendError}</p>
              ) : null}
              <ChatComposer
                modelId={modelId}
                models={models}
                sending={sending}
                streaming={turnInProgress}
                onModelChange={setSelectedModelId}
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
