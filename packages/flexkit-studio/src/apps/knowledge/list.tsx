import type { ChangeEvent, FormEvent, JSX, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistance } from 'date-fns';
import { LayoutGridIcon, LinkIcon, ListIcon, LoaderCircle, UploadIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useSWRInfinite from 'swr/infinite';
import { useIsViewing } from '../../core/apps/app-active';
import { useCanMutate } from '../../core/permissions';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
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
  getStoredKnowledgeViewMode,
  isKnowledgeSourceBusy,
  KNOWLEDGE_ACCEPT,
  KNOWLEDGE_FORMATS_LABEL,
  KNOWLEDGE_MAX_TITLE_LENGTH,
  parseKnowledgeUrl,
  setStoredKnowledgeViewMode,
  summarizeKnowledgeStatus,
  type KnowledgeSource,
  type KnowledgeSourcesList,
  type KnowledgeViewMode,
} from './knowledge';
import {
  announceRegistered,
  describeApiError,
  InfiniteScrollSentinel,
  KnowledgeTypeIcon,
  PageMessage,
  SourceActionsMenu,
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

function KnowledgeListSkeleton({ viewMode }: { viewMode: KnowledgeViewMode }): JSX.Element {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];

  if (viewMode === 'grid') {
    return (
      <div aria-busy="true" className={GRID_CLASSES}>
        <span className="fk:sr-only">Loading documents</span>
        {ids.map((id) => (
          <div className="fk:flex fk:flex-col fk:gap-3 fk:rounded-xl fk:border fk:p-3 fk:corner-squircle" key={id}>
            <span className="fk:flex fk:items-center fk:gap-2">
              <Skeleton className="fk:size-6 fk:rounded-md" />
              <Skeleton className="fk:h-4 fk:flex-1" />
            </span>
            <Skeleton className="fk:aspect-[4/3] fk:w-full fk:rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div aria-busy="true" className="fk:flex fk:flex-col">
      <span className="fk:sr-only">Loading documents</span>
      {ids.map((id) => (
        <div className="fk:flex fk:h-12 fk:items-center fk:gap-3 fk:border-b fk:px-3" key={id}>
          <Skeleton className="fk:size-6 fk:shrink-0 fk:rounded-md" />
          <Skeleton className="fk:h-4 fk:w-1/3" />
          <Skeleton className="fk:ml-auto fk:h-4 fk:w-16" />
          <Skeleton className="fk:hidden fk:h-4 fk:w-24 fk:md:block" />
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

const GRID_CLASSES = 'fk:grid fk:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] fk:gap-4';

function formatAdded(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy');
}

function HiddenBadge(): JSX.Element {
  return (
    <Badge className="fk:shrink-0 fk:corner-squircle" variant="outline">
      Hidden from agent
    </Badge>
  );
}

/** A search hit whose title does not carry the words: the text inside does. */
function ContentMatchBadge(): JSX.Element {
  return (
    <Badge className="fk:shrink-0 fk:corner-squircle" data-knowledge-content-match variant="secondary">
      In content
    </Badge>
  );
}

interface SourceActions {
  onOpen: (_source: KnowledgeSource) => void;
  onRemoved: (_source: KnowledgeSource) => void;
}

type SourceItemProps = SourceActions & { api: KnowledgeApi; projectId: string; source: KnowledgeSource };

/** A click on the row opens the document, unless it landed on a link or control of its own. */
function handleRowClick(event: MouseEvent<HTMLElement>, open: () => void): void {
  if (event.defaultPrevented || (event.target as Element).closest('a, button, [role=menu]')) {
    return;
  }

  open();
}

/**
 * One line of the list: the type mark, the title as a real link (so it can
 * be opened in a new tab), then the status and facts in columns, like a file
 * manager. The whole row is clickable for the mouse; the link carries the
 * keyboard and assistive tech.
 */
function SourceListRow({ api, projectId, source, ...actions }: SourceItemProps): JSX.Element {
  const status = summarizeKnowledgeStatus(source);
  // What went wrong, or what is happening, matters at every width; the passage count can wait for a wide one.
  const detailClass = status.tone === 'ready' ? 'fk:hidden fk:xl:inline' : 'fk:hidden fk:md:inline';

  return (
    <TableRow
      className="fk:h-12 fk:cursor-pointer"
      data-knowledge-row
      onClick={(event) => handleRowClick(event, () => actions.onOpen(source))}
    >
      <TableCell className="fk:max-w-0 fk:w-full">
        <span className="fk:flex fk:min-w-0 fk:items-center fk:gap-3">
          <KnowledgeTypeIcon source={source} />
          <Link
            className="fk:truncate fk:text-sm fk:font-medium fk:hover:underline fk:underline-offset-2 fk:focus-visible:outline-none fk:focus-visible:underline"
            to={source.id}
          >
            {source.title}
          </Link>
          {source.matchedIn === 'content' ? <ContentMatchBadge /> : null}
          {!source.agentVisible ? <HiddenBadge /> : null}
        </span>
      </TableCell>
      <TableCell className="fk:whitespace-nowrap">
        <span className="fk:flex fk:items-center fk:gap-2">
          <StatusBadge label={status.label} tone={status.tone} />
          <span
            className={`${detailClass} fk:max-w-64 fk:truncate fk:text-xs fk:text-muted-foreground`}
            title={status.detail}
          >
            {status.detail}
          </span>
        </span>
      </TableCell>
      <TableCell className="fk:hidden fk:whitespace-nowrap fk:text-muted-foreground fk:md:table-cell">
        {getKnowledgeKindLabel(source)}
      </TableCell>
      <TableCell className="fk:hidden fk:whitespace-nowrap fk:text-right fk:tabular-nums fk:text-muted-foreground fk:md:table-cell">
        {source.size === null ? '—' : formatFileSize(source.size)}
      </TableCell>
      <TableCell className="fk:hidden fk:whitespace-nowrap fk:text-muted-foreground fk:sm:table-cell">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{formatAdded(source.createdAt)}</span>
          </TooltipTrigger>
          <TooltipContent>
            Updated {formatDistance(new Date(source.updatedAt), new Date(), { addSuffix: true })}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="fk:w-12 fk:pr-2 fk:text-right">
        <SourceActionsMenu
          api={api}
          projectId={projectId}
          source={source}
          onOpen={() => actions.onOpen(source)}
          onRemoved={() => actions.onRemoved(source)}
        />
      </TableCell>
    </TableRow>
  );
}

function SourceTable({
  api,
  projectId,
  sources,
  ...actions
}: SourceActions & { api: KnowledgeApi; projectId: string; sources: KnowledgeSource[] }): JSX.Element {
  return (
    <Table data-knowledge-list>
      <TableHeader>
        <TableRow className="fk:hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="fk:hidden fk:md:table-cell">Type</TableHead>
          <TableHead className="fk:hidden fk:text-right fk:md:table-cell">Size</TableHead>
          <TableHead className="fk:hidden fk:sm:table-cell">Added</TableHead>
          <TableHead className="fk:w-12">
            <span className="fk:sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((source) => (
          <SourceListRow api={api} key={source.id} projectId={projectId} source={source} {...actions} />
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * The card's thumbnail: the opening text of the document laid out like a
 * small page, the way a file manager shows the first page. Documents still
 * indexing, or without text, show their type mark instead.
 */
function SourcePreview({ source }: { source: KnowledgeSource }): JSX.Element {
  const preview = source.preview?.trim();

  return (
    <div className="fk:relative fk:aspect-[4/3] fk:overflow-hidden fk:rounded-lg fk:bg-muted fk:corner-squircle">
      {preview ? (
        <div
          aria-hidden
          className="fk:absolute fk:inset-x-4 fk:top-3 fk:bottom-0 fk:overflow-hidden fk:rounded-t-sm fk:bg-background fk:px-3 fk:pt-3 fk:shadow-sm"
        >
          <p className="fk:whitespace-pre-line fk:text-[9px] fk:leading-[1.45] fk:text-foreground/80 fk:select-none">
            {preview}
          </p>
          <span className="fk:pointer-events-none fk:absolute fk:inset-x-0 fk:bottom-0 fk:h-10 fk:bg-gradient-to-t fk:from-background fk:to-transparent" />
        </div>
      ) : (
        <div className="fk:flex fk:h-full fk:items-center fk:justify-center">
          <KnowledgeTypeIcon size={56} source={source} />
        </div>
      )}
    </div>
  );
}

function SourceCard({ api, projectId, source, ...actions }: SourceItemProps): JSX.Element {
  const status = summarizeKnowledgeStatus(source);
  const meta = [getKnowledgeKindLabel(source)];

  if (source.size !== null) {
    meta.push(formatFileSize(source.size));
  }

  meta.push(status.detail);

  // A link laid over the card opens the document (so it can be opened in a
  // new tab too); the menu button sits above it. The title tooltip lives on
  // the card itself, which does receive the pointer.
  return (
    <div
      className="fk:relative fk:flex fk:min-w-0 fk:flex-col fk:gap-3 fk:rounded-xl fk:border fk:bg-card fk:p-3 fk:transition-colors fk:hover:bg-accent/60 fk:has-[>a:focus-visible]:ring-2 fk:has-[>a:focus-visible]:ring-ring fk:corner-squircle"
      data-knowledge-card
      title={source.title}
    >
      <Link
        aria-label={`Open ${source.title}`}
        className="fk:absolute fk:inset-0 fk:rounded-xl fk:focus-visible:outline-none fk:corner-squircle"
        to={source.id}
      />
      <span className="fk:pointer-events-none fk:relative fk:flex fk:min-w-0 fk:items-center fk:gap-2">
        <KnowledgeTypeIcon source={source} />
        <span className="fk:min-w-0 fk:flex-1 fk:truncate fk:text-sm fk:font-medium">{source.title}</span>
        <span className="fk:pointer-events-auto fk:-my-1 fk:-mr-1.5">
          <SourceActionsMenu
            api={api}
            projectId={projectId}
            source={source}
            onOpen={() => actions.onOpen(source)}
            onRemoved={() => actions.onRemoved(source)}
          />
        </span>
      </span>
      <span className="fk:pointer-events-none fk:relative">
        <SourcePreview source={source} />
      </span>
      <span className="fk:pointer-events-none fk:relative fk:flex fk:min-w-0 fk:items-center fk:gap-2">
        <StatusBadge label={status.label} tone={status.tone} />
        <span className="fk:min-w-0 fk:flex-1 fk:truncate fk:text-xs fk:text-muted-foreground">{meta.join(' · ')}</span>
        {source.matchedIn === 'content' ? <ContentMatchBadge /> : null}
        {!source.agentVisible ? <HiddenBadge /> : null}
      </span>
    </div>
  );
}

function SourceGrid({
  api,
  projectId,
  sources,
  ...actions
}: SourceActions & { api: KnowledgeApi; projectId: string; sources: KnowledgeSource[] }): JSX.Element {
  return (
    <div className={GRID_CLASSES} data-knowledge-grid>
      {sources.map((source) => (
        <SourceCard api={api} key={source.id} projectId={projectId} source={source} {...actions} />
      ))}
    </div>
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
  const [viewMode, setViewMode] = useState<KnowledgeViewMode>(() => getStoredKnowledgeViewMode());
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
    emptyMessage = 'No document title or content matches your search.';
  } else if (status) {
    emptyMessage = EMPTY_BY_FILTER[status];
  }

  const actions: SourceActions = {
    onOpen: (source) => void navigate(source.id),
    // Drop the row at once; the global invalidation refetches the pages and counts behind it.
    onRemoved: (removed) =>
      void mutate(
        (current) =>
          current?.map((page) => ({
            ...page,
            count: Math.max(0, page.count - 1),
            sources: page.sources.filter((entry) => entry.id !== removed.id),
          })),
        { revalidate: false }
      ),
  };
  let content: JSX.Element =
    viewMode === 'grid' ? (
      <SourceGrid api={api} projectId={projectId} sources={sources} {...actions} />
    ) : (
      <SourceTable api={api} projectId={projectId} sources={sources} {...actions} />
    );

  if (isInitialLoading) {
    content = <KnowledgeListSkeleton viewMode={viewMode} />;
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
          <div className="fk:flex fk:w-full fk:flex-col fk:gap-5 fk:py-4 fk:pl-4 fk:pr-6">
            <div>
              <h2 className="fk:text-2xl fk:font-semibold">Documents</h2>
              <p className="fk:mt-1 fk:text-sm fk:text-muted-foreground">
                Policies, manuals, specs and other reference material for your team and agents. The agent searches them
                when a question needs them and cites the passage it used.
              </p>
            </div>
            <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-3">
              <Input
                aria-label="Search documents"
                className="fk:w-full fk:max-w-sm"
                placeholder="Search by title or content…"
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
                <ToggleGroup
                  aria-label="Layout"
                  size="sm"
                  type="single"
                  value={viewMode}
                  variant="outline"
                  onValueChange={(value) => {
                    if (value === 'list' || value === 'grid') {
                      setViewMode(value);
                      setStoredKnowledgeViewMode(value);
                    }
                  }}
                >
                  <ToggleGroupItem aria-label="List layout" value="list">
                    <ListIcon className="fk:size-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem aria-label="Grid layout" value="grid">
                    <LayoutGridIcon className="fk:size-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
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
