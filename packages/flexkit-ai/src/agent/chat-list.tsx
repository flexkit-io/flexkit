import type { JSX } from 'react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { LoaderCircle, MessageSquareIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useSWR, { useSWRConfig } from 'swr';
import useSWRInfinite from 'swr/infinite';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@flexkit/studio/ui';
import { fetcher, paths, type ApiClient } from '../api';
import { useProjectApi } from '../replay';
import type { AgentChat, AgentChatSearchResult, AgentChatsList } from '../types';

/** Returns the absolute route prefix of the agent app (`.../ai/agent`). */
export function useAgentBasePath(): string {
  const location = useLocation();
  const marker = '/agent';
  const index = location.pathname.indexOf(marker);

  if (index === -1) {
    return `${location.pathname.replace(/\/$/, '')}/agent`;
  }

  return location.pathname.slice(0, index + marker.length);
}

export function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [delayMs, value]);

  return debounced;
}

function getChatGroupLabel(chat: AgentChat): string {
  const timestamp = new Date(chat.lastMessageAt ?? chat.updatedAt).getTime();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (timestamp >= startOfToday) {
    return 'Today';
  }

  if (timestamp >= startOfToday - 86_400_000) {
    return 'Yesterday';
  }

  if (timestamp >= startOfToday - 7 * 86_400_000) {
    return 'Previous 7 days';
  }

  return 'Older';
}

function groupChats(chats: AgentChat[]): { chats: AgentChat[]; label: string }[] {
  const groups: { chats: AgentChat[]; label: string }[] = [];

  for (const chat of chats) {
    const label = getChatGroupLabel(chat);
    const group = groups.find((candidate) => candidate.label === label);

    if (group) {
      group.chats.push(chat);
    } else {
      groups.push({ chats: [chat], label });
    }
  }

  return groups;
}

function ChatListItem({
  active,
  api,
  chat,
  onChanged,
  onDeleted,
  onOpen,
}: {
  active: boolean;
  api: ApiClient;
  chat: AgentChat;
  onChanged: () => void;
  onDeleted: () => void;
  onOpen: () => void;
}): JSX.Element {
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null);
  const [title, setTitle] = useState(chat.title ?? '');
  const [isMutating, startMutation] = useTransition();
  const label = chat.title?.trim() || 'New chat';

  function handleRename(): void {
    startMutation(async () => {
      await api.renameAgentChat(chat.id, title.trim());
      setDialog(null);
      onChanged();
    });
  }

  function handleDelete(): void {
    startMutation(async () => {
      await api.deleteAgentChat(chat.id);
      setDialog(null);
      onDeleted();
    });
  }

  return (
    <div
      className={`fk:group/chat fk:flex fk:items-center fk:gap-1 fk:rounded-md fk:pr-1 ${
        active ? 'fk:bg-accent' : 'fk:hover:bg-accent/60'
      }`}
    >
      <button
        className="fk:min-w-0 fk:flex-1 fk:truncate fk:px-2 fk:py-1.5 fk:text-left fk:text-sm"
        title={label}
        type="button"
        onClick={onOpen}
      >
        {label}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="fk:size-6 fk:shrink-0 fk:opacity-0 fk:group-hover/chat:opacity-100 fk:data-[state=open]:opacity-100"
            size="icon"
            variant="ghost"
          >
            <MoreHorizontalIcon className="fk:size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => {
              setTitle(chat.title ?? '');
              setDialog('rename');
            }}
          >
            <PencilIcon className="fk:size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="fk:text-destructive" onClick={() => setDialog('delete')}>
            <Trash2Icon className="fk:size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={dialog === 'rename'} onOpenChange={(open) => setDialog(open ? 'rename' : null)}>
        <DialogContent className="fk:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Chat title" />
          <DialogFooter>
            <Button disabled={isMutating || !title.trim()} size="sm" onClick={handleRename}>
              {isMutating ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === 'delete'} onOpenChange={(open) => setDialog(open ? 'delete' : null)}>
        <DialogContent className="fk:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
          </DialogHeader>
          <p className="fk:text-sm fk:text-muted-foreground">
            &ldquo;{label}&rdquo; and its messages will be permanently deleted.
          </p>
          <DialogFooter>
            <Button disabled={isMutating} size="sm" variant="destructive" onClick={handleDelete}>
              {isMutating ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SearchResults({
  onOpen,
  projectId,
  query,
}: {
  onOpen: (_chatId: string) => void;
  projectId: string;
  query: string;
}): JSX.Element {
  const { data, isLoading } = useSWR<{ results: AgentChatSearchResult[] }>(
    paths(projectId).agentChatSearch(query),
    fetcher,
    { keepPreviousData: true }
  );

  if (isLoading && !data) {
    return (
      <div className="fk:flex fk:items-center fk:gap-2 fk:px-2 fk:py-3 fk:text-xs fk:text-muted-foreground">
        <LoaderCircle className="fk:size-3.5 fk:animate-spin" />
        Searching...
      </div>
    );
  }

  if (!data?.results.length) {
    return <p className="fk:px-2 fk:py-3 fk:text-xs fk:text-muted-foreground">No matching messages.</p>;
  }

  return (
    <div className="fk:space-y-1">
      {data.results.map((result) => (
        <button
          className="fk:block fk:w-full fk:rounded-md fk:px-2 fk:py-1.5 fk:text-left fk:hover:bg-accent/60"
          key={result.messageId}
          type="button"
          onClick={() => onOpen(result.chatId)}
        >
          <span className="fk:block fk:truncate fk:text-sm">{result.chatTitle?.trim() || 'New chat'}</span>
          <span className="fk:block fk:truncate fk:text-xs fk:text-muted-foreground">{result.snippet}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * ChatGPT-style chats section embedded in the AI sidebar: new chat button and
 * the user's recent chats grouped by date with rename/delete. When `query` is
 * set, the recent list is replaced by hybrid keyword + semantic search results.
 * Rendered inside the app layout route, so relative navigation resolves
 * against the app root (`agent`, `agent/chats/:chatId`).
 */
export function AgentChatsSection({ query }: { query: string }): JSX.Element | null {
  const { api, projectId } = useProjectApi();
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: globalMutate } = useSWRConfig();
  const activeChatId = /\/agent\/chats\/([^/]+)/.exec(location.pathname)?.[1];
  const { data, mutate, setSize, size } = useSWRInfinite<AgentChatsList>(
    (pageIndex, previousPage: AgentChatsList | null) => {
      if (!projectId || (previousPage && !previousPage.hasMore)) {
        return null;
      }

      return paths(projectId).agentChats(pageIndex * 30);
    },
    fetcher,
    { revalidateFirstPage: true }
  );
  const chats = useMemo(() => (data ?? []).flatMap((page) => page.chats), [data]);
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;
  const groups = useMemo(() => groupChats(chats), [chats]);

  // Refresh the list when the user lands on a chat (new chats, fresh titles).
  useEffect(() => {
    void mutate();
  }, [activeChatId, mutate]);

  if (!projectId || !api) {
    return null;
  }

  const chatApi = api;
  const chatProjectId = projectId;

  function openChat(chatId: string): void {
    navigate(`agent/chats/${chatId}`);
  }

  function handleDeleted(chatId: string): void {
    void mutate();

    if (chatId === activeChatId) {
      navigate('agent');
    } else {
      // Drop the cached detail so a re-open does not show stale data.
      void globalMutate(paths(chatProjectId).agentChat(chatId), undefined, { revalidate: false });
    }
  }

  return (
    <div className="fk:space-y-2">
      {query ? (
        <SearchResults projectId={chatProjectId} query={query} onOpen={openChat} />
      ) : (
        <div className="fk:space-y-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="fk:px-2 fk:pb-1 fk:text-xs fk:font-medium fk:text-muted-foreground">{group.label}</p>
              <div className="fk:space-y-0.5">
                {group.chats.map((chat) => (
                  <ChatListItem
                    active={chat.id === activeChatId}
                    api={chatApi}
                    chat={chat}
                    key={chat.id}
                    onChanged={() => void mutate()}
                    onDeleted={() => handleDeleted(chat.id)}
                    onOpen={() => openChat(chat.id)}
                  />
                ))}
              </div>
            </div>
          ))}
          {chats.length === 0 ? (
            <div className="fk:flex fk:flex-col fk:items-center fk:gap-2 fk:px-2 fk:py-6 fk:text-center fk:text-xs fk:text-muted-foreground">
              <MessageSquareIcon className="fk:size-5" />
              <span>No chats yet. Start a conversation with the agent.</span>
            </div>
          ) : null}
          {hasMore ? (
            <Button className="fk:w-full" size="sm" variant="ghost" onClick={() => void setSize(size + 1)}>
              Load more
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
