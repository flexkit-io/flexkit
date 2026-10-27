import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { formatDistance } from 'date-fns';
import { ArrowLeft, BookOpenIcon, ExternalLinkIcon, LoaderCircle, RefreshCwIcon } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useAuth } from '../../auth/auth-context';
import { useIsViewing } from '../../core/apps/app-active';
import { useCanMutate } from '../../core/permissions';
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
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
import { fetcher, knowledgePaths, type KnowledgeApi, type ProjectSpace } from './api';
import {
  formatFileSize,
  formatKnowledgeLocator,
  formatKnowledgeWarning,
  getKnowledgeKindLabel,
  isKnowledgeSourceBusy,
  KNOWLEDGE_MAX_TITLE_LENGTH,
  KNOWLEDGE_PASSAGES_PAGE_SIZE,
  summarizeKnowledgeStatus,
  toggleSpaceCode,
  type KnowledgePassage,
  type KnowledgePassagesPage,
  type KnowledgeSource,
  type KnowledgeSourceDetail,
} from './knowledge';
import { LinkedRecordsSection } from './record-links';
import {
  describeApiError,
  invalidateKnowledgeLists,
  PageMessage,
  SourceActionsMenu,
  SourceIcon,
  StatusBadge,
  useProjectKnowledge,
} from './shared';

const DETAIL_POLL_INTERVAL_MS = 2_000;

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
          All documents
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
  const version = source.currentVersion?.status === 'published' ? source.currentVersion : null;
  const passageCount = version?.passageCount ?? 0;
  const versionId = version?.id ?? null;
  const getPassagesKey = (pageIndex: number): string | null => {
    if (!versionId || pageIndex * KNOWLEDGE_PASSAGES_PAGE_SIZE >= passageCount) {
      return null;
    }

    const from = pageIndex * KNOWLEDGE_PASSAGES_PAGE_SIZE;
    const path = knowledgePaths(projectId).passages(source.id, {
      from,
      to: Math.min(from + KNOWLEDGE_PASSAGES_PAGE_SIZE - 1, passageCount - 1),
    });

    // The version is part of the key, so a re-index swaps the pages instead
    // of serving the retired ones; the server ignores the extra parameter.
    return `${path}&version=${encodeURIComponent(versionId)}`;
  };
  const {
    data: pages,
    error,
    isLoading,
    setSize,
    size,
  } = useSWRInfinite<KnowledgePassagesPage>(getPassagesKey, fetcher, {
    revalidateFirstPage: false,
  });
  const passages: KnowledgePassage[] = pages?.flatMap((page) => page.passages) ?? [];
  const loaded = passages.length;

  // A new version starts from its first page again.
  useEffect(() => {
    void setSize(1);
  }, [setSize, versionId]);

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
        <Button className="fk:w-fit" size="sm" variant="outline" onClick={() => void setSize(size + 1)}>
          Show more ({String(loaded)} of {String(passageCount)})
        </Button>
      ) : null}
    </div>
  );
}

function SourceSettings({
  api,
  onSaved,
  projectId,
  source,
}: {
  api: KnowledgeApi;
  onSaved: (_source: KnowledgeSource) => void;
  projectId: string;
  source: KnowledgeSource;
}): JSX.Element {
  const canMutate = useCanMutate();
  const [, auth] = useAuth();
  const { data: spacesData } = useSWR<{ spaces: ProjectSpace[] }>(knowledgePaths(projectId).spaces, fetcher);
  const userSpaceCodes = auth.user?.spaces ?? [];
  // Only the caller's own spaces are offered: changing a source needs every
  // space it is shared with, and the server refuses codes the caller lacks.
  const projectSpaces = spacesData?.spaces ?? [];
  const selectableSpaces = projectSpaces.filter((space) => userSpaceCodes.includes(space.code));
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
  let spacesEmptyMessage = 'This project has no spaces yet, so every member can read it.';

  if (projectSpaces.length > 0) {
    spacesEmptyMessage = 'You are not a member of any space in this project.';
  }

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
          <p className="fk:text-sm fk:text-muted-foreground">{spacesEmptyMessage}</p>
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

export function Source(): JSX.Element {
  const { api, projectId } = useProjectKnowledge();
  const { sourceId } = useParams<{ sourceId: string }>();
  const navigate = useNavigate();
  const canMutate = useCanMutate();
  const isViewing = useIsViewing();
  const [isBusy, setIsBusy] = useState(false);
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

  // A failed background refresh keeps the last good data on screen; only a
  // document that never loaded is reported as missing.
  if (error && !data) {
    return <PageMessage>This document does not exist or is not shared with you.</PageMessage>;
  }

  if (isLoading || !data) {
    return <SourceDetailSkeleton />;
  }

  const { job, source } = data;
  const status = summarizeKnowledgeStatus(source, job);
  const version = source.currentVersion;
  const isWorking = isReindexing;

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
            <SourceActionsMenu
              api={api}
              isBusy={isWorking}
              projectId={projectId}
              source={source}
              trigger="page"
              onRemoved={() => navigate('..', { relative: 'path' })}
            />
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
              projectId={projectId}
              source={source}
              onSaved={(saved) => void mutate({ job, source: saved }, { revalidate: false })}
            />
          </section>
          <Separator />
          <section className="fk:flex fk:flex-col fk:gap-4">
            <LinkedRecordsSection api={api} projectId={projectId} source={source} />
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
