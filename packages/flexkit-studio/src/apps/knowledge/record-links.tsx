import type { JSX } from 'react';
import { useDeferredValue, useMemo, useState } from 'react';
import { ChevronRightIcon, LibraryIcon, LoaderCircle, PaperclipIcon, SearchIcon, Unlink2Icon } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { useAppContext } from '../../core/app-context';
import { useConfig } from '../../core/config/config-context';
import { getDisplayAttribute } from '../../core/get-display-attribute';
import type { Entity } from '../../core/types';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  PermissionTooltip,
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
  getKnowledgeKindLabel,
  getKnowledgeLinkLabel,
  getKnowledgeSourcePath,
  groupKnowledgeLinks,
  summarizeKnowledgeStatus,
  type KnowledgeLink,
  type KnowledgeLinkGroup,
  type KnowledgeLinksList,
  type KnowledgeRecordRef,
  type KnowledgeRecordSources,
  type KnowledgeSource,
  type KnowledgeSourcesList,
} from './knowledge';
import { describeApiError, invalidateKnowledgeLinks, SourceIcon, StatusBadge, useProjectKnowledge } from './shared';

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
  record,
  recordLabel,
}: {
  api: KnowledgeApi;
  attachedIds: string[];
  onAttached: (_source: KnowledgeSource) => void;
  onOpenChange: (_open: boolean) => void;
  open: boolean;
  projectId: string;
  record: KnowledgeRecordRef;
  recordLabel: string;
}): JSX.Element {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const { data, error, isLoading } = useSWR<KnowledgeSourcesList>(
    open ? knowledgePaths(projectId).sources({ limit: PICKER_PAGE_SIZE, search: deferredSearch || undefined }) : null,
    fetcher,
    { keepPreviousData: true }
  );
  const candidates = useMemo(() => getAttachableSources(data?.sources ?? [], attachedIds), [attachedIds, data]);

  async function attach(source: KnowledgeSource): Promise<void> {
    setAttachingId(source.id);

    try {
      const result = await api.linkSource(source.id, record);

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
  } else if (isLoading && !data) {
    body = (
      <div aria-busy="true" className="fk:flex fk:flex-col fk:gap-3 fk:py-2">
        <Skeleton className="fk:h-10 fk:w-full" />
        <Skeleton className="fk:h-10 fk:w-full" />
        <Skeleton className="fk:h-10 fk:w-full" />
      </div>
    );
  } else if (candidates.length === 0) {
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
      </ul>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fk:sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Attach a document</DialogTitle>
          <DialogDescription>
            Questions about {recordLabel} are answered from its attached documents first.
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

/**
 * The documents attached to one record, pinned under the record form in the
 * Desk as a collapsible panel: open them, attach another, detach one. The
 * agent searches these first when a question is about this record.
 */
export function RecordKnowledgePanel({
  entityName,
  entityNamePlural,
  recordId,
  recordLabel,
}: {
  entityName: string;
  entityNamePlural: string;
  recordId: string;
  recordLabel: string;
}): JSX.Element | null {
  const { api, projectId } = useProjectKnowledge();
  const canMutate = useCanMutate();
  const [isOpen, setIsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [detachingId, setDetachingId] = useState<string | null>(null);
  const record = useMemo<KnowledgeRecordRef>(() => ({ entity: entityName, recordId }), [entityName, recordId]);
  const { data, error, isLoading, mutate } = useSWR<KnowledgeRecordSources>(
    projectId ? knowledgePaths(projectId).recordSources(record) : null,
    fetcher
  );

  // Built-in entities (assets, tags) are not something a document is about.
  if (!api || !projectId || entityName.startsWith('_')) {
    return null;
  }

  // The platform answers 404 for an entity it does not know, which can
  // happen while a schema change is still deploying; the panel then stays out of the way.
  if (error instanceof FetcherError && error.status === 404) {
    return null;
  }

  const sources = data?.sources ?? [];
  const attachedIds = sources.map((source) => source.id);
  const knowledgeApi = api;

  async function detach(source: KnowledgeSource): Promise<void> {
    setDetachingId(source.id);

    try {
      await knowledgeApi.unlinkSource(source.id, record);
      toast.success(`Detached "${source.title}".`);
      await mutate({ sources: sources.filter((entry) => entry.id !== source.id) }, { revalidate: true });
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
  } else if (sources.length === 0) {
    body = (
      <p className="fk:text-sm fk:text-muted-foreground">
        No documents attached. Attach a manual, spec or contract and the agent answers questions about this record from
        it first.
      </p>
    );
  } else {
    body = (
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
              {canMutate ? (
                <DetachButton
                  disabled={detachingId !== null}
                  label={`Detach ${source.title}`}
                  onClick={() => void detach(source)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  // The record drawer is mounted by the actions manager outside any app, so
  // it carries no tooltip provider of its own. The panel is a flex child of
  // the drawer: collapsed it is one row, open it claims half the height and
  // scrolls inside, so the form above stays visible and scrollable.
  return (
    <TooltipProvider>
      <Collapsible
        className={`fk:flex fk:shrink-0 fk:flex-col fk:border-t ${isOpen ? 'fk:h-1/2' : ''}`}
        data-knowledge-record-panel
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <div className="fk:flex fk:shrink-0 fk:items-center fk:gap-2 fk:px-10 fk:py-2">
          <CollapsibleTrigger asChild>
            <button
              className="fk:flex fk:min-w-0 fk:flex-1 fk:items-center fk:gap-2 fk:rounded-md fk:py-1 fk:text-left fk:text-sm fk:font-semibold fk:tracking-tight fk:hover:text-foreground/80 fk:focus-visible:outline-none fk:focus-visible:ring-2 fk:focus-visible:ring-ring"
              type="button"
            >
              <ChevronRightIcon
                className={`fk:size-4 fk:shrink-0 fk:text-muted-foreground fk:transition-transform ${isOpen ? 'fk:rotate-90' : ''}`}
              />
              <LibraryIcon className="fk:size-4 fk:shrink-0 fk:text-muted-foreground" />
              Knowledge
              {data ? (
                <Badge className="fk:corner-squircle" variant="outline">
                  {sources.length}
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
          record={record}
          recordLabel={recordLabel || `this ${entityNamePlural.replace(/s$/, '') || entityName}`}
          onAttached={(source) => {
            void mutate({ sources: [...sources, source] }, { revalidate: true });
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
function useRecordLabels(group: KnowledgeLinkGroup, schema: Entity[]): RecordLabels {
  const { scope } = useAppContext();
  const displayAttribute = getDisplayAttribute(getEntitySchema(schema, group.entityPlural));
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

    if (!displayAttribute) {
      return labels;
    }

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

  // The query builder throws for an entity it does not know, which can
  // happen between a deploy and the next schema load; such a group shows what the platform knew.
  if (!entitySchema) {
    return <LinkedRecordRows {...props} entityLabel={props.group.entityPlural} labels={{}} />;
  }

  return (
    <ResolvedLinkedRecordGroup
      {...props}
      schema={schema}
      entityLabel={entitySchema.menu?.label ?? props.group.entityPlural}
    />
  );
}

function ResolvedLinkedRecordGroup({
  entityLabel,
  schema,
  ...props
}: LinkedRecordGroupProps & { entityLabel: string; schema: Entity[] }): JSX.Element {
  const labels = useRecordLabels(props.group, schema);

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
  const groups = useMemo(() => groupKnowledgeLinks(links), [links]);

  async function detach(link: KnowledgeLink): Promise<void> {
    setDetachingKey(`${link.entity}:${link.recordId}`);

    try {
      await api.unlinkSource(source.id, { entity: link.entity, recordId: link.recordId });
      toast.success('Detached.');
      await mutate(
        { links: links.filter((entry) => entry.entity !== link.entity || entry.recordId !== link.recordId) },
        { revalidate: true }
      );
      void invalidateKnowledgeLinks();
    } catch (detachError) {
      toast.error(describeApiError(detachError, 'The document could not be detached.'));
    } finally {
      setDetachingKey(null);
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
        Not attached to any record. Open a record in the Desk and use "Attach document" to make this the first place the
        agent looks for questions about it.
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
      <div className="fk:flex fk:items-center fk:gap-2">
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
