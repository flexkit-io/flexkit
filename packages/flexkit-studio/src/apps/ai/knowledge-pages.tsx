import type { ChangeEvent, FormEvent, JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistance } from 'date-fns';
import {
  ArrowLeft,
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  LinkIcon,
  LoaderCircle,
  RefreshCwIcon,
  Trash2,
  UploadIcon,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useSWR, { mutate as mutateGlobal } from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useAuth } from '../../auth/auth-context';
import { useIsViewing } from '../../core/apps/app-active';
import { useConfig } from '../../core/config/config-context';
import { useCanMutate } from '../../core/permissions';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Checkbox,
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
  Switch,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../ui/primitives/alert-dialog';
import { AssetDropZone } from '../asset-manager/data-grid/asset-drop-zone';
import { fetcher, paths } from './api';
import {
  formatFileSize,
  formatKnowledgeLocator,
  formatKnowledgeWarning,
  getKnowledgeFileProblem,
  getKnowledgeKindLabel,
  isKnowledgeSourceBusy,
  KNOWLEDGE_ACCEPT,
  KNOWLEDGE_FORMATS_LABEL,
  KNOWLEDGE_MAX_TITLE_LENGTH,
  KNOWLEDGE_PASSAGES_PAGE_SIZE,
  parseKnowledgeUrl,
  summarizeKnowledgeStatus,
  toggleSpaceCode,
  type KnowledgePassage,
  type KnowledgePassagesPage,
  type KnowledgeSource,
  type KnowledgeSourceDetail,
  type KnowledgeSourcesList,
  type KnowledgeStatusTone,
  type RegisterKnowledgeSourceResult,
} from './knowledge';
import { createKnowledgeApi, KnowledgeApiError, knowledgePaths, type KnowledgeApi } from './knowledge-api';
import { CatalogHeader } from './plugin-pages';
import type { ProjectSpace } from './types';

const KNOWLEDGE_PAGE_SIZE = 25;
const LIST_POLL_INTERVAL_MS = 3_000;
const DETAIL_POLL_INTERVAL_MS = 2_000;

/** Drops every cached page of the document list, so the next visit fetches it afresh. */
function invalidateKnowledgeLists(): Promise<unknown> {
  return mutateGlobal((key) => typeof key === 'string' && key.includes('/knowledge/sources?'), undefined, {
    revalidate: true,
  });
}

const STATUS_TONE_CLASSES: { [tone in KnowledgeStatusTone]: string } = {
  busy: 'fk:bg-amber-500/15 fk:text-amber-700 fk:dark:text-amber-400',
  error: 'fk:bg-destructive/15 fk:text-destructive',
  muted: 'fk:bg-muted fk:text-muted-foreground',
  ready: 'fk:bg-emerald-500/15 fk:text-emerald-700 fk:dark:text-emerald-400',
};

function useProjectKnowledge(): { api: KnowledgeApi | null; projectId: string | undefined } {
  const { currentProjectId } = useConfig();
  const api = useMemo(() => (currentProjectId ? createKnowledgeApi(currentProjectId) : null), [currentProjectId]);

  return { api, projectId: currentProjectId };
}

function PageMessage({ children }: { children: string }): JSX.Element {
  return (
    <div className="fk:rounded-md fk:border fk:border-dashed fk:p-8 fk:text-center fk:text-sm fk:text-muted-foreground fk:corner-squircle">
      {children}
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: KnowledgeStatusTone }): JSX.Element {
  return (
    <Badge className={`fk:border-none fk:corner-squircle ${STATUS_TONE_CLASSES[tone]}`} variant="outline">
      {tone === 'busy' ? <LoaderCircle className="fk:size-3 fk:animate-spin" /> : null}
      {label}
    </Badge>
  );
}

function SourceIcon({ source }: { source: Pick<KnowledgeSource, 'kind'> }): JSX.Element {
  const Icon = source.kind === 'url' ? GlobeIcon : FileTextIcon;

  return (
    <span className="fk:flex fk:size-10 fk:shrink-0 fk:items-center fk:justify-center fk:rounded-lg fk:bg-muted fk:text-muted-foreground fk:corner-squircle">
      <Icon className="fk:size-5" />
    </span>
  );
}

function InfiniteScrollSentinel({ onVisible }: { onVisible: () => void }): JSX.Element {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);

  onVisibleRef.current = onVisible;

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onVisibleRef.current();
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return <div aria-hidden className="fk:h-px" ref={sentinelRef} />;
}

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

function describeApiError(error: unknown, fallback: string): string {
  if (error instanceof KnowledgeApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

/** What the user hears once a document was registered. */
function announceRegistered(result: RegisterKnowledgeSourceResult, name: string): void {
  if (result.duplicate) {
    toast.info(`"${result.source.title}" is already in Knowledge.`);

    return;
  }

  toast.success(`Added ${name}. Indexing starts now.`);
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

export function KnowledgePage(): JSX.Element {
  const { api, projectId } = useProjectKnowledge();
  const navigate = useNavigate();
  const canMutate = useCanMutate();
  const isViewing = useIsViewing();
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

  // Coming back from a detail page must show what changed there. The infinite
  // hook keeps serving its cached pages otherwise, whatever the mount options.
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
        <AlertDescription>
          {search.trim()
            ? 'No documents match your search.'
            : `No documents yet. Upload ${KNOWLEDGE_FORMATS_LABEL} files, or add a public web page, and the agent will search and cite them.`}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <main className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
      <CatalogHeader />
      <AssetDropZone disabled={!canMutate} onDropFiles={addFiles}>
        <div className="fk:min-h-0 fk:flex-1 fk:overflow-auto">
          <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-6 fk:pl-4 fk:pr-6">
            <div>
              <h2 className="fk:text-2xl fk:font-semibold">Knowledge for your agents</h2>
              <p className="fk:mt-2 fk:text-muted-foreground">
                Policies, manuals, specs and other reference documents. The agent searches them when a question needs
                them and cites the passage it used.
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

function SourcePageHeader({ actions, title }: { actions?: JSX.Element; title: string }): JSX.Element {
  return (
    <>
      <div className="fk:flex fk:shrink-0 fk:items-center fk:gap-2 fk:pr-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:h-4" />
        <h1 className="fk:min-w-0 fk:flex-1 fk:truncate fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">
          {title}
        </h1>
        {actions}
      </div>
      <Button asChild className="fk:w-fit fk:shrink-0" size="sm" variant="ghost">
        <Link relative="path" to="..">
          <ArrowLeft className="fk:mr-2 fk:size-4" />
          Knowledge
        </Link>
      </Button>
    </>
  );
}

function SourceDetailSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-6 fk:py-6 fk:pl-4 fk:pr-6">
      <span className="fk:sr-only">Loading document</span>
      <Skeleton className="fk:h-6 fk:w-64" />
      <Skeleton className="fk:h-4 fk:w-96" />
      <Skeleton className="fk:h-32 fk:w-full" />
    </div>
  );
}

function SectionTitle({ children }: { children: string }): JSX.Element {
  return <h3 className="fk:text-sm fk:font-semibold fk:tracking-tight">{children}</h3>;
}

function PassageList({ projectId, source }: { projectId: string; source: KnowledgeSource }): JSX.Element {
  const passageCount = source.currentVersion?.status === 'published' ? source.currentVersion.passageCount : 0;
  const [pageCount, setPageCount] = useState(1);
  const getPassagesKey = (pageIndex: number): string | null => {
    if (passageCount === 0 || pageIndex >= pageCount) {
      return null;
    }

    const from = pageIndex * KNOWLEDGE_PASSAGES_PAGE_SIZE;

    return knowledgePaths(projectId).passages(source.id, {
      from,
      to: Math.min(from + KNOWLEDGE_PASSAGES_PAGE_SIZE - 1, passageCount - 1),
    });
  };
  const {
    data: pages,
    error,
    isLoading,
  } = useSWRInfinite<KnowledgePassagesPage>(getPassagesKey, fetcher, {
    revalidateFirstPage: false,
  });
  const passages: KnowledgePassage[] = pages?.flatMap((page) => page.passages) ?? [];
  const loaded = passages.length;

  if (passageCount === 0) {
    return <p className="fk:text-sm fk:text-muted-foreground">Passages appear here once the document is indexed.</p>;
  }

  if (error) {
    return <p className="fk:text-sm fk:text-destructive">The passages could not be loaded.</p>;
  }

  return (
    <div className="fk:flex fk:flex-col fk:gap-3">
      {passages.map((passage) => {
        const where = formatKnowledgeLocator(passage.locator);

        return (
          <article
            className="fk:rounded-lg fk:border fk:bg-background fk:px-4 fk:py-3 fk:corner-squircle"
            key={passage.id}
          >
            <header className="fk:mb-1.5 fk:flex fk:items-center fk:gap-2 fk:text-xs fk:text-muted-foreground">
              <span className="fk:font-medium">#{String(passage.order + 1)}</span>
              {where ? <span className="fk:truncate">{where}</span> : null}
            </header>
            <p className="fk:whitespace-pre-wrap fk:text-sm fk:leading-relaxed">{passage.text}</p>
          </article>
        );
      })}
      {isLoading ? (
        <div className="fk:flex fk:items-center fk:gap-2 fk:py-2 fk:text-sm fk:text-muted-foreground">
          <LoaderCircle className="fk:size-4 fk:animate-spin" />
          Loading passages…
        </div>
      ) : null}
      {loaded < passageCount && !isLoading ? (
        <Button className="fk:w-fit" size="sm" variant="outline" onClick={() => setPageCount((count) => count + 1)}>
          Show more ({String(loaded)} of {String(passageCount)})
        </Button>
      ) : null}
    </div>
  );
}

function SourceSettings({
  api,
  onSaved,
  source,
}: {
  api: KnowledgeApi;
  onSaved: (_source: KnowledgeSource) => void;
  source: KnowledgeSource;
}): JSX.Element {
  const { projectId } = useProjectKnowledge();
  const canMutate = useCanMutate();
  const [, auth] = useAuth();
  const { data: spacesData } = useSWR<{ spaces: ProjectSpace[] }>(projectId ? paths(projectId).spaces : null, fetcher);
  const userSpaceCodes = auth.user?.spaces ?? [];
  // Only the caller's own spaces are offered: changing a source needs every
  // space it is shared with, and the server refuses codes the caller lacks.
  const selectableSpaces = (spacesData?.spaces ?? []).filter((space) => userSpaceCodes.includes(space.code));
  const foreignSpaces = source.spaces.filter((code) => !userSpaceCodes.includes(code));
  const [title, setTitle] = useState(source.title);
  const [isSaving, setIsSaving] = useState(false);
  const titleChanged = title.trim() !== source.title && title.trim().length > 0;

  useEffect(() => {
    setTitle(source.title);
  }, [source.title]);

  async function save(patch: { agentVisible?: boolean; spaces?: string[]; title?: string }): Promise<void> {
    if (!canMutate) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await api.updateSource(source.id, patch);

      onSaved(result.source);
      void invalidateKnowledgeLists();
    } catch (error) {
      toast.error(describeApiError(error, 'The document could not be updated.'));
    } finally {
      setIsSaving(false);
    }
  }

  const disabled = !canMutate || isSaving || foreignSpaces.length > 0;

  return (
    <div className="fk:flex fk:flex-col fk:gap-5">
      {foreignSpaces.length > 0 ? (
        <Alert>
          <AlertDescription>
            This document is shared with spaces you are not a member of ({foreignSpaces.join(', ')}), so only an owner
            or a member of all of them can change it.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="fk:flex fk:flex-col fk:gap-1.5">
        <Label htmlFor="knowledge-title">Title</Label>
        <div className="fk:flex fk:items-center fk:gap-2">
          <Input
            className="fk:max-w-md"
            disabled={disabled}
            id="knowledge-title"
            maxLength={KNOWLEDGE_MAX_TITLE_LENGTH}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && titleChanged) {
                event.preventDefault();
                void save({ title: title.trim() });
              }
            }}
          />
          {titleChanged ? (
            <Button disabled={disabled} size="sm" variant="outline" onClick={() => void save({ title: title.trim() })}>
              Save
            </Button>
          ) : null}
        </div>
        <p className="fk:text-xs fk:text-muted-foreground">The agent cites the document by this title.</p>
      </div>
      <label className="fk:flex fk:w-fit fk:cursor-pointer fk:items-center fk:gap-3">
        <Switch
          checked={source.agentVisible}
          disabled={disabled}
          onCheckedChange={(checked) => void save({ agentVisible: checked })}
        />
        <span className="fk:flex fk:flex-col">
          <span className="fk:text-sm fk:font-medium">Visible to the agent</span>
          <span className="fk:text-xs fk:text-muted-foreground">
            Off keeps the document in the list for people but out of the agent's searches.
          </span>
        </span>
      </label>
      <div className="fk:flex fk:flex-col fk:gap-2">
        <span className="fk:text-sm fk:font-medium">Spaces</span>
        <p className="fk:text-xs fk:text-muted-foreground">
          {source.spaces.length === 0
            ? 'Every project member can read this document. Pick spaces to limit it to their members.'
            : 'Only members of the selected spaces (and the agent working for them) can read this document.'}
        </p>
        {selectableSpaces.length === 0 ? (
          <p className="fk:text-sm fk:text-muted-foreground">
            {(spacesData?.spaces ?? []).length === 0
              ? 'This project has no spaces yet, so every member can read it.'
              : 'You are not a member of any space in this project.'}
          </p>
        ) : (
          <div className="fk:flex fk:flex-wrap fk:gap-x-6 fk:gap-y-2">
            {selectableSpaces.map((space) => (
              <label className="fk:flex fk:cursor-pointer fk:items-center fk:gap-2 fk:text-sm" key={space.id}>
                <Checkbox
                  checked={source.spaces.includes(space.code)}
                  disabled={disabled}
                  onCheckedChange={() => void save({ spaces: toggleSpaceCode(source.spaces, space.code) })}
                />
                {space.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function KnowledgeSourcePage(): JSX.Element {
  const { api, projectId } = useProjectKnowledge();
  const { sourceId } = useParams<{ sourceId: string }>();
  const navigate = useNavigate();
  const canMutate = useCanMutate();
  const isViewing = useIsViewing();
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<KnowledgeSourceDetail>(
    projectId && sourceId ? knowledgePaths(projectId).source(sourceId) : null,
    fetcher,
    { refreshInterval: isViewing && isBusy ? DETAIL_POLL_INTERVAL_MS : 0 }
  );

  useEffect(() => {
    setIsBusy(data ? isKnowledgeSourceBusy(data.source, data.job) : false);
  }, [data]);

  if (!projectId || !api || !sourceId) {
    return <PageMessage>Select a document.</PageMessage>;
  }

  if (error) {
    return <PageMessage>This document does not exist or is not shared with you.</PageMessage>;
  }

  if (isLoading || !data) {
    return <SourceDetailSkeleton />;
  }

  const { job, source } = data;
  const status = summarizeKnowledgeStatus(source, job);
  const version = source.currentVersion;
  const isWorking = isDeleting || isReindexing;

  async function reindex(): Promise<void> {
    setIsReindexing(true);

    try {
      const result = await api!.reingestSource(source.id);

      toast.success('Re-indexing started.');
      await mutate({ job: result.job, source: { ...source, status: 'processing' } }, { revalidate: true });
    } catch (reindexError) {
      toast.error(describeApiError(reindexError, 'The document could not be re-indexed.'));
    } finally {
      setIsReindexing(false);
    }
  }

  async function remove(): Promise<void> {
    setIsDeleting(true);

    try {
      await api!.deleteSource(source.id);
      toast.success(`Removed "${source.title}".`);
      await invalidateKnowledgeLists();
      navigate('..', { relative: 'path' });
    } catch (deleteError) {
      toast.error(describeApiError(deleteError, 'The document could not be removed.'));
      setIsDeleting(false);
    }
  }

  const facts: { label: string; value: JSX.Element | string }[] = [
    { label: 'Type', value: getKnowledgeKindLabel(source) },
  ];

  if (source.originUrl) {
    facts.push({
      label: 'Address',
      value: (
        <a
          className="fk:inline-flex fk:items-center fk:gap-1 fk:underline fk:underline-offset-2"
          href={source.originUrl}
          rel="noreferrer"
          target="_blank"
        >
          <span className="fk:truncate">{source.originUrl}</span>
          <ExternalLinkIcon className="fk:size-3.5 fk:shrink-0" />
        </a>
      ),
    });
  }

  if (source.size !== null) {
    facts.push({ label: 'Size', value: formatFileSize(source.size) });
  }

  facts.push({ label: 'Added', value: formatDistance(new Date(source.createdAt), new Date(), { addSuffix: true }) });

  if (version?.publishedAt) {
    facts.push({
      label: 'Indexed',
      value: formatDistance(new Date(version.publishedAt), new Date(), { addSuffix: true }),
    });
  }

  return (
    <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:gap-3 fk:pb-3">
      <SourcePageHeader
        actions={
          <div className="fk:flex fk:items-center fk:gap-2">
            <PermissionTooltip disabled={!canMutate}>
              <Button
                disabled={!canMutate || isWorking || status.tone === 'busy'}
                size="sm"
                variant="outline"
                onClick={() => void reindex()}
              >
                {isReindexing ? <LoaderCircle className="fk:animate-spin" /> : <RefreshCwIcon />}
                Re-index
              </Button>
            </PermissionTooltip>
            <AlertDialog>
              <PermissionTooltip disabled={!canMutate}>
                <AlertDialogTrigger asChild>
                  <Button disabled={!canMutate || isWorking} size="sm" variant="outline">
                    <Trash2 />
                    Remove
                  </Button>
                </AlertDialogTrigger>
              </PermissionTooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this document?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{source.title}" and its indexed passages are deleted for everyone. Answers the agent gave earlier
                    keep their citations, but the document can no longer be opened.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void remove()}>Remove document</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
        title={source.title}
      />
      <div className="fk:min-h-0 fk:flex-1 fk:overflow-auto">
        <div className="fk:mx-auto fk:flex fk:w-full fk:max-w-4xl fk:flex-col fk:gap-8 fk:py-2 fk:pl-4 fk:pr-6">
          <section className="fk:flex fk:items-start fk:gap-4">
            <SourceIcon source={source} />
            <div className="fk:flex fk:min-w-0 fk:flex-1 fk:flex-col fk:gap-2">
              <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-2">
                <StatusBadge label={status.label} tone={status.tone} />
                <span className="fk:text-sm fk:text-muted-foreground">{status.detail}</span>
              </div>
              {job?.error?.hint && (status.tone === 'error' || job.state === 'failed') ? (
                <p className="fk:text-sm fk:text-muted-foreground">{job.error.hint}</p>
              ) : null}
              <dl className="fk:grid fk:grid-cols-[auto_1fr] fk:gap-x-4 fk:gap-y-1 fk:text-sm">
                {facts.map((fact) => (
                  <div className="fk:contents" key={fact.label}>
                    <dt className="fk:text-muted-foreground">{fact.label}</dt>
                    <dd className="fk:min-w-0 fk:truncate">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              {version && version.warnings.length > 0 ? (
                <Alert>
                  <AlertDescription>
                    <ul className="fk:list-disc fk:pl-4">
                      {version.warnings.map((warning) => (
                        <li key={warning}>{formatKnowledgeWarning(warning)}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </section>
          <Separator />
          <section className="fk:flex fk:flex-col fk:gap-4">
            <SectionTitle>Settings</SectionTitle>
            <SourceSettings
              api={api}
              source={source}
              onSaved={(saved) => void mutate({ job, source: saved }, { revalidate: false })}
            />
          </section>
          <Separator />
          <section className="fk:flex fk:flex-col fk:gap-4">
            <div className="fk:flex fk:items-center fk:gap-2">
              <BookOpenIcon className="fk:size-4 fk:text-muted-foreground" />
              <SectionTitle>Passages</SectionTitle>
            </div>
            <p className="fk:text-sm fk:text-muted-foreground">
              The document is split into passages the agent searches and cites. Each one keeps its page, slide or
              section so a citation points back to the right place.
            </p>
            <PassageList projectId={projectId} source={source} />
          </section>
        </div>
      </div>
    </div>
  );
}
