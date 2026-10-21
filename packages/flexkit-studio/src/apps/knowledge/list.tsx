import type { ChangeEvent, FormEvent, JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistance } from 'date-fns';
import { LinkIcon, LoaderCircle, UploadIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import { useIsViewing } from '../../core/apps/app-active';
import { useCanMutate } from '../../core/permissions';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PermissionTooltip,
  Separator,
  SidebarTrigger,
  Skeleton,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui';
import { AssetDropZone } from '../asset-manager/data-grid/asset-drop-zone';
import { fetcher, knowledgePaths, type KnowledgeApi } from './api';
import {
  formatFileSize,
  getKnowledgeFileProblem,
  getKnowledgeKindLabel,
  isKnowledgeSourceBusy,
  KNOWLEDGE_ACCEPT,
  KNOWLEDGE_FORMATS_LABEL,
  KNOWLEDGE_MAX_TITLE_LENGTH,
  parseKnowledgeUrl,
  summarizeKnowledgeStatus,
  type KnowledgeSource,
  type KnowledgeSourcesList,
} from './knowledge';
import {
  announceRegistered,
  describeApiError,
  InfiniteScrollSentinel,
  PageMessage,
  SourceIcon,
  StatusBadge,
  useProjectKnowledge,
} from './shared';
import { useKnowledgeStatusFilter } from './sidebar';

const KNOWLEDGE_PAGE_SIZE = 25;
const LIST_POLL_INTERVAL_MS = 3_000;

const EMPTY_BY_FILTER = {
  failed: 'No document failed to index.',
  processing: 'No document is being indexed right now.',
  ready: 'No document is ready yet.',
};

function KnowledgeListSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-1">
      <span className="fk:sr-only">Loading documents</span>
      {['a', 'b', 'c', 'd'].map((id) => (
        <div className="fk:-mx-3 fk:flex fk:items-center fk:gap-3 fk:px-3 fk:py-2" key={id}>
          <Skeleton className="fk:size-10 fk:shrink-0 fk:rounded-lg" />
          <span className="fk:flex fk:min-w-0 fk:flex-1 fk:flex-col fk:gap-1.5">
            <Skeleton className="fk:h-4 fk:w-48" />
            <Skeleton className="fk:h-4 fk:w-32" />
          </span>
        </div>
      ))}
    </div>
  );
}

interface PendingUpload {
  id: string;
  name: string;
}

/** Runs file uploads one after another and reports each outcome; the list revalidates after every registration. */
function useKnowledgeUploads(
  api: KnowledgeApi | null,
  onRegistered: () => void
): {
  addFiles: (_files: File[]) => void;
  pending: PendingUpload[];
} {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  function addFiles(files: File[]): void {
    if (!api) {
      return;
    }

    for (const file of files) {
      const problem = getKnowledgeFileProblem(file);

      if (problem) {
        toast.error(problem);

        continue;
      }

      const upload: PendingUpload = {
        id: `${file.name}-${String(Date.now())}-${String(Math.random())}`,
        name: file.name,
      };

      setPending((current) => [...current, upload]);
      queueRef.current = queueRef.current
        .then(async () => {
          try {
            const result = await api.addFile(file);

            announceRegistered(result, file.name);
            onRegistered();
          } catch (error) {
            toast.error(describeApiError(error, `${file.name} could not be added.`));
          } finally {
            setPending((current) => current.filter((entry) => entry.id !== upload.id));
          }
        })
        .catch(() => undefined);
    }
  }

  return { addFiles, pending };
}

function AddUrlDialog({
  api,
  onOpenChange,
  onRegistered,
  open,
}: {
  api: KnowledgeApi;
  onOpenChange: (_open: boolean) => void;
  onRegistered: () => void;
  open: boolean;
}): JSX.Element {
  const [value, setValue] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function close(): void {
    onOpenChange(false);
    setValue('');
    setTitle('');
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const parsed = parseKnowledgeUrl(value);

    if ('error' in parsed) {
      setError(parsed.error);

      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await api.addUrl({ title: title.trim() || undefined, url: parsed.url });

      announceRegistered(result, parsed.url);
      onRegistered();
      close();
    } catch (submitError) {
      setError(describeApiError(submitError, 'The page could not be added.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent>
        <form className="fk:flex fk:flex-col fk:gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Add a web page</DialogTitle>
            <DialogDescription>
              The page is fetched and indexed now, and again whenever you re-index it. Only public pages work.
            </DialogDescription>
          </DialogHeader>
          <div className="fk:flex fk:flex-col fk:gap-1.5">
            <Label htmlFor="knowledge-url">Address</Label>
            <Input
              autoFocus
              id="knowledge-url"
              inputMode="url"
              placeholder="https://example.com/help/returns"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError('');
              }}
            />
          </div>
          <div className="fk:flex fk:flex-col fk:gap-1.5">
            <Label htmlFor="knowledge-url-title">Title (optional)</Label>
            <Input
              id="knowledge-url-title"
              maxLength={KNOWLEDGE_MAX_TITLE_LENGTH}
              placeholder="Defaults to the page address"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          {error ? <p className="fk:text-sm fk:text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button disabled={isSubmitting} size="sm" type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button disabled={isSubmitting || !value.trim()} size="sm" type="submit">
              {isSubmitting ? (
                <LoaderCircle className="fk:size-4 fk:animate-spin" />
              ) : (
                <LinkIcon className="fk:size-4" />
              )}
              Add page
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SourceRow({ onOpen, source }: { onOpen: () => void; source: KnowledgeSource }): JSX.Element {
  const status = summarizeKnowledgeStatus(source);
  const meta = [getKnowledgeKindLabel(source)];

  if (source.size !== null) {
    meta.push(formatFileSize(source.size));
  }

  meta.push(status.detail);

  return (
    <button
      className="fk:-mx-3 fk:flex fk:min-w-0 fk:items-center fk:gap-3 fk:rounded-lg fk:px-3 fk:py-2 fk:text-left fk:transition-colors fk:hover:bg-accent fk:focus-visible:bg-accent fk:focus-visible:outline-none fk:corner-squircle"
      type="button"
      onClick={onOpen}
    >
      <SourceIcon source={source} />
      <span className="fk:min-w-0 fk:flex-1">
        <span className="fk:flex fk:min-w-0 fk:items-center fk:gap-2">
          <span className="fk:truncate fk:text-sm fk:font-medium">{source.title}</span>
          {!source.agentVisible ? (
            <Badge className="fk:shrink-0 fk:corner-squircle" variant="outline">
              Hidden from agent
            </Badge>
          ) : null}
        </span>
        <span className="fk:block fk:truncate fk:text-sm fk:text-muted-foreground">{meta.join(' · ')}</span>
      </span>
      <span className="fk:hidden fk:shrink-0 fk:text-xs fk:text-muted-foreground fk:sm:block">
        {formatDistance(new Date(source.updatedAt), new Date(), { addSuffix: true })}
      </span>
      <StatusBadge label={status.label} tone={status.tone} />
    </button>
  );
}

function ListHeader(): JSX.Element {
  return (
    <div className="fk:mb-2 fk:flex fk:shrink-0 fk:items-center fk:gap-2 fk:pr-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
        </TooltipTrigger>
        <TooltipContent>Toggle Sidebar</TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="fk:h-4" />
      <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">Knowledge</h1>
    </div>
  );
}

export function List(): JSX.Element {
  const { api, projectId } = useProjectKnowledge();
  const navigate = useNavigate();
  const canMutate = useCanMutate();
  const isViewing = useIsViewing();
  const status = useKnowledgeStatusFilter();
  const [search, setSearch] = useState('');
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const getSourcesKey = (pageIndex: number, previousPage: KnowledgeSourcesList | null): string | null => {
    if (!projectId || (previousPage && !previousPage.hasMore)) {
      return null;
    }

    return knowledgePaths(projectId).sources({
      limit: KNOWLEDGE_PAGE_SIZE,
      offset: pageIndex * KNOWLEDGE_PAGE_SIZE,
      search: search.trim() || undefined,
      status,
    });
  };
  const {
    data: pages,
    isLoading,
    mutate,
    setSize,
    size,
  } = useSWRInfinite<KnowledgeSourcesList>(getSourcesKey, fetcher, {
    // Rows that are still indexing change on their own; poll while one is in flight and the tab is in front.
    refreshInterval: isViewing && isBusy ? LIST_POLL_INTERVAL_MS : 0,
  });
  const sources = useMemo(() => pages?.flatMap((page) => page.sources) ?? [], [pages]);
  const total = pages?.[0]?.count ?? 0;
  const hasMore = pages?.[pages.length - 1]?.hasMore ?? false;
  const isLoadingMore = pages !== undefined && size > pages.length;
  const isInitialLoading = isLoading && sources.length === 0;
  const { addFiles, pending } = useKnowledgeUploads(api, () => void mutate());
  const mutateRef = useRef(mutate);

  mutateRef.current = mutate;

  // Coming back from a document page must show what changed there. The
  // infinite hook keeps serving its cached pages otherwise, whatever the
  // mount options.
  useEffect(() => {
    void mutateRef.current();
  }, []);

  useEffect(() => {
    setIsBusy(sources.some((source) => isKnowledgeSourceBusy(source)));
  }, [sources]);

  if (!projectId || !api) {
    return <PageMessage>Select a project to manage its knowledge.</PageMessage>;
  }

  function handleFilesPicked(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.target.files ?? []);

    event.target.value = '';
    addFiles(files);
  }

  let emptyMessage = `No documents yet. Upload ${KNOWLEDGE_FORMATS_LABEL} files, or add a public web page, and the agent will search and cite them.`;

  if (search.trim()) {
    emptyMessage = 'No documents match your search.';
  } else if (status) {
    emptyMessage = EMPTY_BY_FILTER[status];
  }

  let content: JSX.Element = (
    <div className="fk:flex fk:flex-col fk:gap-1">
      {sources.map((source) => (
        <SourceRow key={source.id} source={source} onOpen={() => navigate(source.id)} />
      ))}
    </div>
  );

  if (isInitialLoading) {
    content = <KnowledgeListSkeleton />;
  } else if (sources.length === 0) {
    content = (
      <Alert>
        <AlertDescription>{emptyMessage}</AlertDescription>
      </Alert>
    );
  }

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
      <ListHeader />
      <AssetDropZone disabled={!canMutate} onDropFiles={addFiles}>
        <div className="fk:min-h-0 fk:flex-1 fk:overflow-auto">
          <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-6 fk:pl-4 fk:pr-6">
            <div>
              <h2 className="fk:text-2xl fk:font-semibold">Documents for your team and agents</h2>
              <p className="fk:mt-2 fk:text-muted-foreground">
                Policies, manuals, specs and other reference material. People read them here; the agent searches them
                when a question needs them and cites the passage it used.
              </p>
            </div>
            <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3">
              <Input
                aria-label="Search documents"
                className="fk:w-full fk:max-w-xs"
                placeholder="Search documents…"
                value={search}
                onChange={(event) => {
                  void setSize(1);
                  setSearch(event.target.value);
                }}
              />
              {total > 0 ? (
                <span className="fk:text-sm fk:text-muted-foreground">
                  {total.toLocaleString()} {total === 1 ? 'document' : 'documents'}
                </span>
              ) : null}
              <div className="fk:ml-auto fk:flex fk:items-center fk:gap-2">
                <PermissionTooltip disabled={!canMutate}>
                  <Button disabled={!canMutate} size="sm" variant="outline" onClick={() => setIsUrlDialogOpen(true)}>
                    <LinkIcon />
                    Add web page
                  </Button>
                </PermissionTooltip>
                <PermissionTooltip disabled={!canMutate}>
                  <Button disabled={!canMutate} size="sm" onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon />
                    Upload documents
                  </Button>
                </PermissionTooltip>
                <input
                  accept={KNOWLEDGE_ACCEPT}
                  className="fk:hidden"
                  multiple
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFilesPicked}
                />
              </div>
            </div>
            {pending.length > 0 ? (
              <div className="fk:flex fk:flex-col fk:gap-1 fk:text-sm fk:text-muted-foreground">
                {pending.map((upload) => (
                  <span className="fk:flex fk:items-center fk:gap-2" key={upload.id}>
                    <LoaderCircle className="fk:size-4 fk:animate-spin" />
                    Uploading {upload.name}…
                  </span>
                ))}
              </div>
            ) : null}
            {content}
            {hasMore && !isLoadingMore ? (
              <InfiniteScrollSentinel onVisible={() => void setSize((current) => current + 1)} />
            ) : null}
            {isLoadingMore ? (
              <div className="fk:flex fk:items-center fk:justify-center fk:gap-2 fk:py-4 fk:text-sm fk:text-muted-foreground">
                <LoaderCircle className="fk:size-4 fk:animate-spin" />
                <span>Loading more documents...</span>
              </div>
            ) : null}
          </div>
        </div>
      </AssetDropZone>
      <AddUrlDialog
        api={api}
        open={isUrlDialogOpen}
        onOpenChange={setIsUrlDialogOpen}
        onRegistered={() => void mutate()}
      />
    </main>
  );
}
