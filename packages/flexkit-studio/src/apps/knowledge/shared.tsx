import type { JSX, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DownloadIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  LoaderCircle,
  Trash2Icon,
} from 'lucide-react';
import { mutate as mutateGlobal } from 'swr';
import { useConfig } from '../../core/config/config-context';
import { useCanMutate } from '../../core/permissions';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
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
} from '../../ui/primitives/alert-dialog';
import {
  createKnowledgeApi,
  isKnowledgeLinkKey,
  isKnowledgeListKey,
  KnowledgeApiError,
  knowledgePaths,
  type KnowledgeApi,
} from './api';
import {
  getKnowledgeKindLabel,
  getKnowledgeTypeBadge,
  type KnowledgeSource,
  type KnowledgeStatusTone,
  type KnowledgeTypeTone,
  type RegisterKnowledgeSourceResult,
} from './knowledge';

const STATUS_TONE_CLASSES: { [tone in KnowledgeStatusTone]: string } = {
  busy: 'fk:bg-amber-500/15 fk:text-amber-700 fk:dark:text-amber-400',
  error: 'fk:bg-destructive/15 fk:text-destructive',
  muted: 'fk:bg-muted fk:text-muted-foreground',
  ready: 'fk:bg-emerald-500/15 fk:text-emerald-700 fk:dark:text-emerald-400',
};

export function useProjectKnowledge(): { api: KnowledgeApi | null; projectId: string | undefined } {
  const { currentProjectId } = useConfig();
  const api = useMemo(() => (currentProjectId ? createKnowledgeApi(currentProjectId) : null), [currentProjectId]);

  return { api, projectId: currentProjectId };
}

/** Drops every cached page of the document list, so the next visit fetches it afresh. */
export function invalidateKnowledgeLists(): Promise<unknown> {
  return mutateGlobal(isKnowledgeListKey, undefined, { revalidate: true });
}

/** Drops every cached link listing (a record's documents, a document's records) after a link changed. */
export function invalidateKnowledgeLinks(): Promise<unknown> {
  return mutateGlobal(isKnowledgeLinkKey, undefined, { revalidate: true });
}

export function describeApiError(error: unknown, fallback: string): string {
  if (error instanceof KnowledgeApiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

/** What the user hears once a document was registered. */
export function announceRegistered(result: RegisterKnowledgeSourceResult, name: string): void {
  if (result.duplicate) {
    toast.info(`"${result.source.title}" is already in Knowledge.`);

    return;
  }

  toast.success(`Added ${name}. Indexing starts now.`);
}

export function PageMessage({ children }: { children: string }): JSX.Element {
  return (
    <div className="fk:rounded-md fk:border fk:border-dashed fk:p-8 fk:text-center fk:text-sm fk:text-muted-foreground fk:corner-squircle">
      {children}
    </div>
  );
}

export function StatusBadge({ label, tone }: { label: string; tone: KnowledgeStatusTone }): JSX.Element {
  return (
    <Badge className={`fk:border-none fk:corner-squircle ${STATUS_TONE_CLASSES[tone]}`} variant="outline">
      {tone === 'busy' ? <LoaderCircle className="fk:size-3 fk:animate-spin" /> : null}
      {label}
    </Badge>
  );
}

const TYPE_TONE_CLASSES: { [tone in KnowledgeTypeTone]: string } = {
  amber: 'fk:bg-amber-500 fk:text-white',
  blue: 'fk:bg-blue-600 fk:text-white',
  red: 'fk:bg-red-600 fk:text-white',
  slate: 'fk:bg-slate-500 fk:text-white',
  teal: 'fk:bg-teal-600 fk:text-white',
  violet: 'fk:bg-violet-600 fk:text-white',
};

/** The document's format as a small colored mark, the way a file manager tags PDFs red and documents blue. */
export function KnowledgeTypeIcon({
  className = '',
  source,
}: {
  className?: string;
  source: Pick<KnowledgeSource, 'kind' | 'mimeType'>;
}): JSX.Element {
  const badge = getKnowledgeTypeBadge(source);
  const Glyph = source.kind === 'url' ? GlobeIcon : FileTextIcon;

  // The code is for the eye; a screen reader hears the format's name.
  return (
    <span
      aria-label={getKnowledgeKindLabel(source)}
      className={`fk:relative fk:flex fk:size-6 fk:shrink-0 fk:items-center fk:justify-center fk:rounded-md fk:corner-squircle ${TYPE_TONE_CLASSES[badge.tone]} ${className}`}
      data-knowledge-type={badge.code}
      role="img"
    >
      <Glyph className="fk:size-3.5" strokeWidth={2.25} />
    </span>
  );
}

export function SourceIcon({ source }: { source: Pick<KnowledgeSource, 'kind'> }): JSX.Element {
  const Icon = source.kind === 'url' ? GlobeIcon : FileTextIcon;

  return (
    <span className="fk:flex fk:size-10 fk:shrink-0 fk:items-center fk:justify-center fk:rounded-lg fk:bg-muted fk:text-muted-foreground fk:corner-squircle">
      <Icon className="fk:size-5" />
    </span>
  );
}

export function InfiniteScrollSentinel({ onVisible }: { onVisible: () => void }): JSX.Element {
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

/**
 * The actions of one document, behind a three-dots button: open (lists
 * only), download the original file (web pages open their address instead)
 * and remove, behind one confirmation. The list and the document page share
 * it so the copy, the download link and the busy rules stay the same.
 */
export function SourceActionsMenu({
  api,
  isBusy = false,
  onOpen,
  onRemoved,
  projectId,
  source,
  trigger = 'row',
}: {
  api: KnowledgeApi;
  /** Another action on the document is in flight; removing waits for it. */
  isBusy?: boolean;
  /** Offered as the first item when given (the document page is already open). */
  onOpen?: () => void;
  /** The document is gone: drop it from the list, or leave its page. The list invalidation is done here. */
  onRemoved: () => void;
  projectId: string;
  source: KnowledgeSource;
  /** How the button looks: a quiet icon in a row or card, an outlined one next to page actions. */
  trigger?: 'row' | 'page';
}): JSX.Element {
  const canMutate = useCanMutate();
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  async function remove(): Promise<void> {
    setIsRemoving(true);

    try {
      await api.deleteSource(source.id);
      toast.success(`Removed "${source.title}".`);
      setIsConfirmingRemoval(false);
      onRemoved();
      void invalidateKnowledgeLists();
    } catch (removeError) {
      toast.error(describeApiError(removeError, 'The document could not be removed.'));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Actions for ${source.title}`}
            className={trigger === 'row' ? 'fk:size-8 fk:shrink-0 fk:text-muted-foreground' : undefined}
            data-knowledge-menu
            size="icon-sm"
            variant={trigger === 'row' ? 'ghost' : 'outline'}
          >
            <EllipsisVerticalIcon className="fk:size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onOpen ? <DropdownMenuItem onSelect={onOpen}>Open</DropdownMenuItem> : null}
          {source.path ? (
            <DropdownMenuItem asChild>
              <a href={knowledgePaths(projectId).file(source.id)}>
                <DownloadIcon />
                Download
              </a>
            </DropdownMenuItem>
          ) : null}
          {source.originUrl ? (
            <DropdownMenuItem asChild>
              <a href={source.originUrl} rel="noreferrer" target="_blank">
                <ExternalLinkIcon />
                Open page
              </a>
            </DropdownMenuItem>
          ) : null}
          {onOpen || source.path || source.originUrl ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem
            disabled={!canMutate || isBusy}
            variant="destructive"
            onSelect={() => setIsConfirmingRemoval(true)}
          >
            <Trash2Icon />
            Remove
          </DropdownMenuItem>
          {canMutate ? null : (
            <DropdownMenuLabel className="fk:max-w-56 fk:whitespace-normal fk:text-xs fk:font-normal fk:text-muted-foreground">
              Your member role cannot remove documents.
            </DropdownMenuLabel>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={isConfirmingRemoval} onOpenChange={setIsConfirmingRemoval}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this document?</AlertDialogTitle>
            <AlertDialogDescription>
              "{source.title}" and its indexed passages are deleted for everyone. Answers the agent gave earlier keep
              their citations, but the document can no longer be opened.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRemoving}
              onClick={(event: MouseEvent) => {
                event.preventDefault();
                void remove();
              }}
            >
              {isRemoving ? <LoaderCircle className="fk:animate-spin" /> : null}
              Remove document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
