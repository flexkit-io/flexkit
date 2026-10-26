import type { JSX } from 'react';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  BookOpenTextIcon,
  ChevronRightIcon,
  LayersIcon,
  LoaderCircle,
  PaperclipIcon,
  PlusIcon,
  SearchIcon,
  Unlink2Icon,
  XIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useAppContext } from '../../core/app-context';
import { useConfig } from '../../core/config/config-context';
import { getDisplayAttribute } from '../../core/get-display-attribute';
import type { Attribute, Entity } from '../../core/types';
import { useCanMutate } from '../../core/permissions';
import { useDispatch } from '../../entities/actions-context';
import { getEntitySchema } from '../../graphql-client/queries';
import type { MappedEntityItem } from '../../graphql-client/types';
import { useEntityQuery } from '../../graphql-client/use-entity-query';
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  PermissionTooltip,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui';
import { fetcher, FetcherError, knowledgePaths, type KnowledgeApi } from './api';
import {
  getAttachableSources,
  getEntityLinkLabel,
  getKnowledgeKindLabel,
  getKnowledgeLinkLabel,
  getKnowledgeSourcePath,
  getLinkableEntities,
  groupKnowledgeLinks,
  summarizeKnowledgeStatus,
  type KnowledgeEntityLink,
  type KnowledgeEntitySources,
  type KnowledgeLink,
  type KnowledgeLinkGroup,
  type KnowledgeLinksList,
  type KnowledgeLinkTarget,
  type KnowledgeRecordRef,
  type KnowledgeRecordSources,
  type KnowledgeSource,
  type KnowledgeSourcesList,
} from './knowledge';
import {
  describeApiError,
  InfiniteScrollSentinel,
  invalidateKnowledgeLinks,
  SourceIcon,
  StatusBadge,
  useProjectKnowledge,
} from './shared';

const PICKER_PAGE_SIZE = 50;

function DetachButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={label}
          className="fk:size-7 fk:shrink-0"
          disabled={disabled}
          size="icon"
          variant="ghost"
          onClick={onClick}
        >
          <Unlink2Icon className="fk:size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The picker behind "Attach document": the project's documents, searched by
 * title, minus the ones already attached. Picking one links it right away.
 */
function AttachDocumentDialog({
  api,
  attachedIds,
  onAttached,
  onOpenChange,
  open,
  projectId,
  target,
  targetLabel,
}: {
  api: KnowledgeApi;
  attachedIds: string[];
  onAttached: (_source: KnowledgeSource) => void;
  onOpenChange: (_open: boolean) => void;
  open: boolean;
  projectId: string;
  /** A record, or an entity type when it names no record. */
  target: KnowledgeLinkTarget;
  /** How the target is called in the dialog copy: a record title, or an entity label. */
  targetLabel: string;
}): JSX.Element {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const getPageKey = (pageIndex: number, previousPage: KnowledgeSourcesList | null): string | null => {
    if (!open || (previousPage && !previousPage.hasMore)) {
      return null;
    }

    return knowledgePaths(projectId).sources({
      limit: PICKER_PAGE_SIZE,
      offset: pageIndex * PICKER_PAGE_SIZE,
      search: deferredSearch || undefined,
    });
  };
  // Paged like the document list: the attached ones are hidden client-side,
  // so a record with many documents attached must be able to reach the next page.
  const {
    data: pages,
    error,
    isLoading,
    setSize,
    size,
  } = useSWRInfinite<KnowledgeSourcesList>(getPageKey, fetcher, { keepPreviousData: true });
  const candidates = useMemo(
    () => getAttachableSources(pages?.flatMap((page) => page.sources) ?? [], attachedIds),
    [attachedIds, pages]
  );
  const hasMore = pages?.[pages.length - 1]?.hasMore ?? false;
  const isLoadingMore = pages !== undefined && size > pages.length;

  async function attach(source: KnowledgeSource): Promise<void> {
    setAttachingId(source.id);

    try {
      const result = await api.linkSource(source.id, target);

      toast.success(result.linked ? `Attached "${source.title}".` : `"${source.title}" was already attached.`);
      onAttached(source);
      onOpenChange(false);
    } catch (attachError) {
      toast.error(describeApiError(attachError, 'The document could not be attached.'));
    } finally {
      setAttachingId(null);
    }
  }

  let body: JSX.Element;

  if (error) {
    body = <p className="fk:py-6 fk:text-center fk:text-sm fk:text-destructive">The documents could not be loaded.</p>;
  } else if (isLoading && !pages) {
    body = (
      <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-3 fk:py-2">
        <Skeleton className="fk:h-10 fk:w-full" />
        <Skeleton className="fk:h-10 fk:w-full" />
        <Skeleton className="fk:h-10 fk:w-full" />
      </div>
    );
  } else if (candidates.length === 0 && !hasMore) {
    body = (
      <p className="fk:py-6 fk:text-center fk:text-sm fk:text-muted-foreground">
        {deferredSearch
          ? 'No documents match your search.'
          : 'Every document is attached already, or there are none yet. Add documents in Knowledge first.'}
      </p>
    );
  } else {
    body = (
      <ul className="fk:flex fk:max-h-80 fk:flex-col fk:overflow-y-auto fk:-mx-2">
        {candidates.map((source) => {
          const status = summarizeKnowledgeStatus(source);
          const isAttaching = attachingId === source.id;

          return (
            <li key={source.id}>
              <button
                className="fk:flex fk:w-full fk:min-w-0 fk:items-center fk:gap-3 fk:rounded-lg fk:px-2 fk:py-2 fk:text-left fk:transition-colors fk:hover:bg-accent fk:focus-visible:bg-accent fk:focus-visible:outline-none fk:disabled:opacity-60 fk:corner-squircle"
                disabled={attachingId !== null}
                type="button"
                onClick={() => void attach(source)}
              >
                <SourceIcon source={source} />
                <span className="fk:min-w-0 fk:flex-1">
                  <span className="fk:block fk:truncate fk:text-sm fk:font-medium">{source.title}</span>
                  <span className="fk:block fk:truncate fk:text-xs fk:text-muted-foreground">
                    {getKnowledgeKindLabel(source)} · {status.detail}
                  </span>
                </span>
                {isAttaching ? (
                  <LoaderCircle className="fk:size-4 fk:shrink-0 fk:animate-spin fk:text-muted-foreground" />
                ) : (
                  <StatusBadge label={status.label} tone={status.tone} />
                )}
              </button>
            </li>
          );
        })}
        {hasMore && !isLoadingMore ? (
          <li aria-hidden>
            <InfiniteScrollSentinel onVisible={() => void setSize((current) => current + 1)} />
          </li>
        ) : null}
        {isLoadingMore ? (
          <li className="fk:flex fk:justify-center fk:py-2">
            <LoaderCircle className="fk:size-4 fk:animate-spin fk:text-muted-foreground" />
          </li>
        ) : null}
      </ul>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fk:sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach a document</DialogTitle>
          <DialogDescription>
            {target.recordId === undefined
              ? `Documents attached to every ${targetLabel} are searched before the rest of Knowledge when a question is about one of them, or about ${targetLabel} in general.`
              : `Documents attached to ${targetLabel} are searched before the rest of Knowledge when a question is about it.`}
          </DialogDescription>
        </DialogHeader>
        <div className="fk:relative">
          <SearchIcon className="fk:pointer-events-none fk:absolute fk:left-2.5 fk:top-1/2 fk:size-4 fk:-translate-y-1/2 fk:text-muted-foreground" />
          <Input
            aria-label="Search documents"
            autoFocus
            className="fk:pl-8"
            placeholder="Search documents by title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {body}
      </DialogContent>
    </Dialog>
  );
}

/** Document rows shared by the record panel and the entity dialog: icon, title, kind and status, plus an optional action. */
function SourceRows({
  projectId,
  renderAction,
  sources,
}: {
  projectId: string;
  renderAction?: (_source: KnowledgeSource) => JSX.Element | null;
  sources: KnowledgeSource[];
}): JSX.Element {
  return (
    <ul className="fk:flex fk:flex-col fk:gap-1 fk:-mx-2">
      {sources.map((source) => {
        const status = summarizeKnowledgeStatus(source);

        return (
          <li
            className="fk:flex fk:min-w-0 fk:items-center fk:gap-2 fk:rounded-lg fk:px-2 fk:py-1.5 fk:corner-squircle"
            key={source.id}
          >
            <Link
              className="fk:flex fk:min-w-0 fk:flex-1 fk:items-center fk:gap-3 fk:rounded-md fk:hover:underline fk:underline-offset-2"
              to={getKnowledgeSourcePath(projectId, source.id)}
            >
              <SourceIcon source={source} />
              <span className="fk:min-w-0 fk:flex-1">
                <span className="fk:block fk:truncate fk:text-sm fk:font-medium">{source.title}</span>
                <span className="fk:block fk:truncate fk:text-xs fk:text-muted-foreground">
                  {getKnowledgeKindLabel(source)} · {status.detail}
                </span>
              </span>
            </Link>
            <StatusBadge label={status.label} tone={status.tone} />
            {renderAction?.(source)}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The documents attached to every record of an entity type, behind a button
 * in the Desk list toolbar: open them, attach another, detach one. Only the
 * project's own entities qualify, and the button stays out while the schema
 * is unknown.
 */
export function EntityKnowledgeButton({ entityName }: { entityName: string }): JSX.Element | null {
  const { api, projectId } = useProjectKnowledge();
  const { currentProject } = useConfig();
  const [isOpen, setIsOpen] = useState(false);
  const entitySchema = currentProject?.schema.find((entity) => entity.name === entityName);
  const isLinkable = Boolean(entitySchema) && !entityName.startsWith('_');
  const { data, error } = useSWR<KnowledgeEntitySources>(
    projectId && isLinkable ? knowledgePaths(projectId).entitySources(entityName) : null,
    fetcher
  );

  if (!api || !projectId || !entitySchema || !isLinkable || (error instanceof FetcherError && error.status === 404)) {
    return null;
  }

  const count = data?.sources.length ?? 0;

  return (
    <>
      <Button
        aria-label={`Knowledge for every ${getEntityLinkLabel(entitySchema)}`}
        className="fk:h-8"
        data-knowledge-entity-button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
      >
        <BookOpenTextIcon />
        Knowledge
        {count > 0 ? (
          <Badge className="fk:corner-squircle" variant="secondary">
            {count}
          </Badge>
        ) : null}
      </Button>
      <EntityKnowledgeDialog
        api={api}
        entityLabel={getEntityLinkLabel(entitySchema)}
        entityName={entityName}
        open={isOpen}
        projectId={projectId}
        onOpenChange={setIsOpen}
      />
    </>
  );
}

function EntityKnowledgeDialog({
  api,
  entityLabel,
  entityName,
  onOpenChange,
  open,
  projectId,
}: {
  api: KnowledgeApi;
  entityLabel: string;
  entityName: string;
  onOpenChange: (_open: boolean) => void;
  open: boolean;
  projectId: string;
}): JSX.Element {
  const canMutate = useCanMutate();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [detachingId, setDetachingId] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<KnowledgeEntitySources>(
    knowledgePaths(projectId).entitySources(entityName),
    fetcher
  );
  const sources = data?.sources ?? [];
  const target = useMemo<KnowledgeLinkTarget>(() => ({ entity: entityName }), [entityName]);

  async function detach(source: KnowledgeSource): Promise<void> {
    setDetachingId(source.id);

    try {
      await api.unlinkSource(source.id, target);
      toast.success(`"${source.title}" no longer applies to every ${entityLabel}.`);
      await mutate({ sources: sources.filter((entry) => entry.id !== source.id) }, { revalidate: false });
      void invalidateKnowledgeLinks();
    } catch (detachError) {
      toast.error(describeApiError(detachError, 'The document could not be detached.'));
    } finally {
      setDetachingId(null);
    }
  }

  let body: JSX.Element;

  if (error) {
    body = <p className="fk:text-sm fk:text-destructive">The documents could not be loaded.</p>;
  } else if (isLoading && !data) {
    body = (
      <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-2">
        <Skeleton className="fk:h-9 fk:w-full" />
        <Skeleton className="fk:h-9 fk:w-2/3" />
      </div>
    );
  } else if (sources.length === 0) {
    body = (
      <p className="fk:text-sm fk:text-muted-foreground">
        No documents apply to every {entityLabel} yet. Attach a guide, a policy or a spec that holds for all of them and
        the agent searches it first when asked about any {entityLabel}, or about {entityLabel} in general.
      </p>
    );
  } else {
    body = (
      <SourceRows
        projectId={projectId}
        sources={sources}
        renderAction={(source) =>
          canMutate ? (
            <DetachButton
              disabled={detachingId !== null}
              label={`Detach ${source.title}`}
              onClick={() => void detach(source)}
            />
          ) : null
        }
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fk:sm:max-w-lg" data-knowledge-entity-dialog>
        <DialogHeader>
          <DialogTitle className="fk:flex fk:items-center fk:gap-2">
            <BookOpenTextIcon className="fk:size-4 fk:text-muted-foreground" />
            Knowledge for every {entityLabel}
            {data ? (
              <Badge className="fk:corner-squircle" variant="outline">
                {sources.length}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Documents attached here apply to every {entityLabel}; each record can hold its own on top.
          </DialogDescription>
        </DialogHeader>
        <div className="fk:max-h-80 fk:overflow-y-auto">{body}</div>
        <div className="fk:flex fk:justify-end">
          <PermissionTooltip disabled={!canMutate}>
            <Button disabled={!canMutate} size="sm" variant="outline" onClick={() => setIsPickerOpen(true)}>
              <PaperclipIcon />
              Attach document
            </Button>
          </PermissionTooltip>
        </div>
        <AttachDocumentDialog
          api={api}
          attachedIds={sources.map((source) => source.id)}
          open={isPickerOpen}
          projectId={projectId}
          target={target}
          targetLabel={entityLabel}
          onAttached={(source) => {
            void mutate({ sources: [...sources, source] }, { revalidate: false });
            void invalidateKnowledgeLinks();
          }}
          onOpenChange={setIsPickerOpen}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The documents attached to one record, pinned under the record form in the
 * Desk as a collapsible panel: open them, attach another, detach one. The
 * agent searches these before the rest of Knowledge when a question is about this record.
 */
export function RecordKnowledgePanel({
  entityName,
  recordId,
  recordLabel,
}: {
  entityName: string;
  recordId: string;
  recordLabel: string;
}): JSX.Element | null {
  const { api, projectId } = useProjectKnowledge();
  const { currentProject } = useConfig();
  const canMutate = useCanMutate();
  const [isOpen, setIsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [detachingId, setDetachingId] = useState<string | null>(null);
  const record = useMemo<KnowledgeRecordRef>(() => ({ entity: entityName, recordId }), [entityName, recordId]);
  const entitySchema = currentProject?.schema.find((entity) => entity.name === entityName);
  const entityLabel = entitySchema ? getEntityLinkLabel(entitySchema) : entityName;
  // Built-in entities (assets, tags) are not something a document is about, so they are not even asked.
  const isLinkable = !entityName.startsWith('_');
  const { data, error, isLoading, mutate } = useSWR<KnowledgeRecordSources>(
    projectId && isLinkable ? knowledgePaths(projectId).recordSources(record) : null,
    fetcher
  );

  if (!api || !projectId || !isLinkable) {
    return null;
  }

  // The platform answers 404 for an entity it does not know, which can
  // happen while a schema change is still deploying; the panel then stays out of the way.
  if (error instanceof FetcherError && error.status === 404) {
    return null;
  }

  const sources = data?.sources ?? [];
  const inherited = data?.inherited ?? [];
  const attachedIds = sources.map((source) => source.id);
  const knowledgeApi = api;

  async function detach(source: KnowledgeSource): Promise<void> {
    setDetachingId(source.id);

    try {
      await knowledgeApi.unlinkSource(source.id, record);
      toast.success(`Detached "${source.title}".`);
      // The global invalidation below revalidates this key too; one refetch is enough.
      await mutate({ sources: sources.filter((entry) => entry.id !== source.id), inherited }, { revalidate: false });
      void invalidateKnowledgeLinks();
    } catch (detachError) {
      toast.error(describeApiError(detachError, 'The document could not be detached.'));
    } finally {
      setDetachingId(null);
    }
  }

  let body: JSX.Element;

  if (error) {
    body = <p className="fk:text-sm fk:text-destructive">The attached documents could not be loaded.</p>;
  } else if (isLoading && !data) {
    body = (
      <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-2">
        <Skeleton className="fk:h-9 fk:w-full" />
        <Skeleton className="fk:h-9 fk:w-2/3" />
      </div>
    );
  } else {
    body = (
      <div className="fk:flex fk:flex-col fk:gap-4">
        {sources.length === 0 ? (
          <p className="fk:text-sm fk:text-muted-foreground">
            No documents attached. Attach a manual, spec or contract and the agent will use it alongside the record's
            data when asked about this record.
          </p>
        ) : (
          <SourceRows
            projectId={projectId}
            sources={sources}
            renderAction={(source) =>
              canMutate ? (
                <DetachButton
                  disabled={detachingId !== null}
                  label={`Detach ${source.title}`}
                  onClick={() => void detach(source)}
                />
              ) : null
            }
          />
        )}
        {inherited.length > 0 ? (
          <div className="fk:flex fk:flex-col fk:gap-1" data-knowledge-inherited>
            <span className="fk:text-xs fk:font-medium fk:uppercase fk:tracking-wide fk:text-muted-foreground">
              Applies to every {entityLabel}
            </span>
            <SourceRows projectId={projectId} sources={inherited} />
          </div>
        ) : null}
      </div>
    );
  }

  // The record drawer is mounted by the actions manager outside any app, so
  // it carries no tooltip provider of its own. The panel is a flex child of
  // the drawer: collapsed it is one row, open it claims half the height and
  // scrolls inside, so the form above stays visible and scrollable.
  return (
    <TooltipProvider>
      <Collapsible
        className={`fk:z-10 fk:flex fk:shrink-0 fk:flex-col fk:border-t fk:bg-background ${isOpen ? 'fk:h-1/2' : ''}`}
        data-knowledge-record-panel
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <div className="fk:flex fk:shrink-0 fk:items-center fk:gap-2 fk:pl-4 fk:pr-10 fk:py-2">
          <CollapsibleTrigger asChild>
            <button
              className="fk:flex fk:min-w-0 fk:flex-1 fk:items-center fk:gap-2 fk:rounded-md fk:py-1 fk:text-left fk:text-sm fk:font-semibold fk:tracking-tight fk:hover:text-foreground/80 fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring"
              type="button"
            >
              <ChevronRightIcon
                className={`fk:size-4 fk:shrink-0 fk:text-muted-foreground fk:transition-transform ${isOpen ? 'fk:rotate-90' : ''}`}
              />
              <BookOpenTextIcon className="fk:size-4 fk:shrink-0 fk:text-muted-foreground" />
              Knowledge
              {data ? (
                <Badge className="fk:corner-squircle" variant="outline">
                  {sources.length + inherited.length}
                </Badge>
              ) : null}
            </button>
          </CollapsibleTrigger>
          {isOpen ? (
            <PermissionTooltip disabled={!canMutate}>
              <Button disabled={!canMutate} size="sm" variant="outline" onClick={() => setIsPickerOpen(true)}>
                <PaperclipIcon />
                Attach document
              </Button>
            </PermissionTooltip>
          ) : null}
        </div>
        <CollapsibleContent className="fk:min-h-0 fk:flex-1 fk:overflow-y-auto fk:px-10 fk:pb-6">
          {body}
        </CollapsibleContent>
        <AttachDocumentDialog
          api={api}
          attachedIds={attachedIds}
          open={isPickerOpen}
          projectId={projectId}
          target={record}
          targetLabel={recordLabel || `this ${entityName}`}
          onAttached={(source) => {
            // A document that applied to the whole type now hangs on the record itself.
            void mutate(
              { sources: [...sources, source], inherited: inherited.filter((entry) => entry.id !== source.id) },
              { revalidate: false }
            );
            void invalidateKnowledgeLinks();
          }}
          onOpenChange={setIsPickerOpen}
        />
      </Collapsible>
    </TooltipProvider>
  );
}

type RecordLabels = { [recordId: string]: string };

/**
 * Resolves the labels of one entity's linked records with a single display
 * query. The platform only names records whose display attribute it can read
 * from the node; a space-scoped one lives on other nodes, so the Studio asks
 * the data itself, the way the Desk grid does. Only called for a deployed entity.
 */
function useRecordLabels(group: KnowledgeLinkGroup, schema: Entity[], displayAttribute: Attribute): RecordLabels {
  const { scope } = useAppContext();
  const ids = group.links.map((link) => link.recordId);
  const { data } = useEntityQuery({
    entityNamePlural: group.entityPlural,
    schema,
    scope,
    selection: 'display',
    includeCount: false,
    variables: { where: { _id: { in: ids } }, limit: ids.length },
  });

  return useMemo(() => {
    const labels: RecordLabels = {};

    for (const item of (data ?? []) as MappedEntityItem[]) {
      const value = item[displayAttribute.name];

      if (typeof value === 'string' && value.trim()) {
        labels[item._id] = value;
      }
    }

    return labels;
  }, [data, displayAttribute]);
}

interface LinkedRecordGroupProps {
  canMutate: boolean;
  detachingKey: string | null;
  group: KnowledgeLinkGroup;
  onDetach: (_link: KnowledgeLink) => void;
}

function LinkedRecordGroup(props: LinkedRecordGroupProps): JSX.Element {
  const { currentProject } = useConfig();
  const schema = useMemo(() => currentProject?.schema ?? [], [currentProject]);
  const entitySchema = getEntitySchema(schema, props.group.entityPlural);
  const displayAttribute = getDisplayAttribute(entitySchema);

  // The query builder throws for an entity it does not know or that has no
  // attributes yet, which can happen between a deploy and the next schema
  // load; such a group shows what the platform knew.
  if (!entitySchema || !displayAttribute) {
    return (
      <LinkedRecordRows {...props} entityLabel={entitySchema?.menu?.label ?? props.group.entityPlural} labels={{}} />
    );
  }

  return (
    <ResolvedLinkedRecordGroup
      {...props}
      displayAttribute={displayAttribute}
      schema={schema}
      entityLabel={entitySchema.menu?.label ?? props.group.entityPlural}
    />
  );
}

function ResolvedLinkedRecordGroup({
  displayAttribute,
  entityLabel,
  schema,
  ...props
}: LinkedRecordGroupProps & { displayAttribute: Attribute; entityLabel: string; schema: Entity[] }): JSX.Element {
  const labels = useRecordLabels(props.group, schema, displayAttribute);

  return <LinkedRecordRows {...props} entityLabel={entityLabel} labels={labels} />;
}

function LinkedRecordRows({
  canMutate,
  detachingKey,
  entityLabel,
  group,
  labels,
  onDetach,
}: LinkedRecordGroupProps & { entityLabel: string; labels: RecordLabels }): JSX.Element {
  const dispatch = useDispatch();

  return (
    <div className="fk:flex fk:flex-col fk:gap-1">
      <span className="fk:text-xs fk:font-medium fk:uppercase fk:tracking-wide fk:text-muted-foreground">
        {entityLabel}
      </span>
      <ul className="fk:flex fk:flex-col fk:-mx-2">
        {group.links.map((link) => {
          const label = getKnowledgeLinkLabel(link, labels[link.recordId]);
          const key = `${link.entity}:${link.recordId}`;

          return (
            <li
              className="fk:flex fk:min-w-0 fk:items-center fk:gap-2 fk:rounded-lg fk:px-2 fk:py-1 fk:corner-squircle"
              key={key}
            >
              <button
                className="fk:min-w-0 fk:flex-1 fk:truncate fk:text-left fk:text-sm fk:hover:underline fk:underline-offset-2"
                title={link.recordId}
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'EditEntity',
                    payload: { entityId: link.recordId, entityNamePlural: group.entityPlural },
                  })
                }
              >
                {label}
              </button>
              {canMutate ? (
                <DetachButton
                  disabled={detachingKey !== null}
                  label={`Detach from ${label}`}
                  onClick={() => onDetach(link)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The records a document is attached to, on the document page. Attaching
 * happens from the record's side in the Desk, where the record is in view.
 */
export function LinkedRecordsSection({
  api,
  projectId,
  source,
}: {
  api: KnowledgeApi;
  projectId: string;
  source: KnowledgeSource;
}): JSX.Element {
  const canMutate = useCanMutate();
  const [detachingKey, setDetachingKey] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR<KnowledgeLinksList>(
    knowledgePaths(projectId).links(source.id),
    fetcher
  );
  const links = useMemo(() => data?.links ?? [], [data]);
  const entities = useMemo(() => data?.entities ?? [], [data]);
  const groups = useMemo(() => groupKnowledgeLinks(links), [links]);

  async function detach(link: KnowledgeLink): Promise<void> {
    setDetachingKey(`${link.entity}:${link.recordId}`);

    try {
      await api.unlinkSource(source.id, { entity: link.entity, recordId: link.recordId });
      toast.success('Detached.');
      await mutate(
        {
          links: links.filter((entry) => entry.entity !== link.entity || entry.recordId !== link.recordId),
          entities,
        },
        { revalidate: false }
      );
      void invalidateKnowledgeLinks();
    } catch (detachError) {
      toast.error(describeApiError(detachError, 'The document could not be detached.'));
    } finally {
      setDetachingKey(null);
    }
  }

  async function detachEntity(link: KnowledgeEntityLink): Promise<void> {
    setDetachingKey(`${link.entity}:*`);

    try {
      await api.unlinkSource(source.id, { entity: link.entity });
      toast.success('Detached.');
      await mutate(
        { links, entities: entities.filter((entry) => entry.entity !== link.entity) },
        { revalidate: false }
      );
      void invalidateKnowledgeLinks();
    } catch (detachError) {
      toast.error(describeApiError(detachError, 'The document could not be detached.'));
    } finally {
      setDetachingKey(null);
    }
  }

  async function attachEntity(entity: Entity): Promise<void> {
    try {
      const result = await api.linkSource(source.id, { entity: entity.name });

      toast.success(
        result.linked
          ? `Applies to every ${getEntityLinkLabel(entity)} now.`
          : `Already applied to every ${getEntityLinkLabel(entity)}.`
      );
      await mutate(
        {
          links,
          entities: entities.some((entry) => entry.entity === entity.name)
            ? entities
            : [...entities, { entity: entity.name, entityPlural: entity.plural }],
        },
        { revalidate: false }
      );
      void invalidateKnowledgeLinks();
    } catch (attachError) {
      toast.error(describeApiError(attachError, 'The document could not be attached.'));
    }
  }

  let body: JSX.Element;

  if (error) {
    body = <p className="fk:text-sm fk:text-destructive">The linked records could not be loaded.</p>;
  } else if (isLoading && !data) {
    body = (
      <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-2">
        <Skeleton className="fk:h-6 fk:w-1/2" />
        <Skeleton className="fk:h-6 fk:w-1/3" />
      </div>
    );
  } else if (groups.length === 0) {
    body = (
      <p className="fk:text-sm fk:text-muted-foreground">
        Not attached to any record. Open a record in the Desk and use "Attach document" so the agent searches this
        document before the rest of Knowledge when asked about that record.
      </p>
    );
  } else {
    body = (
      <div className="fk:flex fk:flex-col fk:gap-4">
        {groups.map((group) => (
          <LinkedRecordGroup
            canMutate={canMutate}
            detachingKey={detachingKey}
            group={group}
            key={group.entityPlural}
            onDetach={(link) => void detach(link)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <AppliesToEntities
        canMutate={canMutate}
        detachingKey={detachingKey}
        entities={entities}
        isLoading={isLoading && !data}
        onAttach={(entity) => void attachEntity(entity)}
        onDetach={(link) => void detachEntity(link)}
      />
      <div className="fk:mt-2 fk:flex fk:items-center fk:gap-2">
        <PaperclipIcon className="fk:size-4 fk:text-muted-foreground" />
        <h3 className="fk:text-sm fk:font-semibold fk:tracking-tight">Linked records</h3>
        {links.length > 0 ? (
          <Badge className="fk:corner-squircle" variant="outline">
            {links.length}
          </Badge>
        ) : null}
      </div>
      <p className="fk:text-sm fk:text-muted-foreground">
        When a question is about one of these records, the agent searches this document before the rest.
      </p>
      {body}
    </>
  );
}

/**
 * The entity types a document applies to, on the document page: chips for
 * the current ones, and a picker over the project's remaining entities. A
 * document attached to a type is searched first for any record of it.
 */
function AppliesToEntities({
  canMutate,
  detachingKey,
  entities,
  isLoading,
  onAttach,
  onDetach,
}: {
  canMutate: boolean;
  detachingKey: string | null;
  entities: KnowledgeEntityLink[];
  isLoading: boolean;
  onAttach: (_entity: Entity) => void;
  onDetach: (_link: KnowledgeEntityLink) => void;
}): JSX.Element {
  const { currentProject } = useConfig();
  const schema = useMemo(() => currentProject?.schema ?? [], [currentProject]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const candidates = useMemo(() => getLinkableEntities(schema, entities), [entities, schema]);
  const labelOf = (link: KnowledgeEntityLink): string => {
    const entity = schema.find((candidate) => candidate.name === link.entity);

    return entity ? getEntityLinkLabel(entity) : link.entityPlural;
  };

  return (
    <div className="fk:flex fk:flex-col fk:gap-3" data-knowledge-applies-to>
      <div className="fk:flex fk:items-center fk:gap-2">
        <LayersIcon className="fk:size-4 fk:text-muted-foreground" />
        <h3 className="fk:text-sm fk:font-semibold fk:tracking-tight">Applies to</h3>
        {entities.length > 0 ? (
          <Badge className="fk:corner-squircle" variant="outline">
            {entities.length}
          </Badge>
        ) : null}
      </div>
      <p className="fk:text-sm fk:text-muted-foreground">
        Attach this document to a whole entity type and the agent searches it before the rest of Knowledge for every
        record of that type, and for questions about the type in general.
      </p>
      {isLoading ? (
        <Skeleton className="fk:h-7 fk:w-1/3" />
      ) : (
        <div className="fk:flex fk:flex-wrap fk:items-center fk:gap-2">
          {entities.map((link) => {
            const label = labelOf(link);

            return (
              <Badge
                className="fk:gap-1 fk:py-1 fk:pl-2.5 fk:pr-1 fk:corner-squircle"
                key={link.entity}
                variant="secondary"
              >
                <span className="fk:capitalize">{label}</span>
                {canMutate ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-label={`No longer apply to every ${label}`}
                        className="fk:rounded-sm fk:p-0.5 fk:text-muted-foreground fk:hover:text-foreground fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring fk:disabled:opacity-50"
                        disabled={detachingKey !== null}
                        type="button"
                        onClick={() => onDetach(link)}
                      >
                        <XIcon className="fk:size-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>No longer apply to every {label}</TooltipContent>
                  </Tooltip>
                ) : null}
              </Badge>
            );
          })}
          <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
            <PermissionTooltip disabled={!canMutate}>
              <PopoverTrigger asChild>
                <Button className="fk:h-7" disabled={!canMutate || candidates.length === 0} size="sm" variant="outline">
                  <PlusIcon />
                  Add entity type
                </Button>
              </PopoverTrigger>
            </PermissionTooltip>
            <PopoverContent align="start" className="fk:w-64 fk:p-0">
              <Command>
                <CommandInput placeholder="Search entity types" />
                <CommandList>
                  <CommandEmpty>No entity type matches.</CommandEmpty>
                  <CommandGroup>
                    {candidates.map((entity) => (
                      <CommandItem
                        key={entity.name}
                        keywords={[entity.name, entity.plural]}
                        value={entity.name}
                        onSelect={() => {
                          setIsPickerOpen(false);
                          onAttach(entity);
                        }}
                      >
                        <span className="fk:capitalize">{getEntityLinkLabel(entity)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
