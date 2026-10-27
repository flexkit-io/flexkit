import type { JSX, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DownloadIcon, EllipsisVerticalIcon, ExternalLinkIcon, LoaderCircle, Trash2Icon } from 'lucide-react';
import { mutate as mutateGlobal } from 'swr';
// File type icons: Untitled UI's free file icons, Solid variant. The set is
// published as the MIT package `@untitledui/file-icons`; the page below shows
// every icon and offers each as SVG or JSX should another format need one.
// https://www.untitledui.com/resources/file-icons
import { Document } from '@untitledui/file-icons/dist/solid/document.mjs';
import { Docx } from '@untitledui/file-icons/dist/solid/docx.mjs';
import { Html } from '@untitledui/file-icons/dist/solid/html.mjs';
import { Pdf } from '@untitledui/file-icons/dist/solid/pdf.mjs';
import { Pptx } from '@untitledui/file-icons/dist/solid/pptx.mjs';
import { Txt } from '@untitledui/file-icons/dist/solid/txt.mjs';
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
  getKnowledgeFormat,
  type KnowledgeFileIcon,
  type KnowledgeSource,
  type KnowledgeStatusTone,
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

const FILE_ICONS: { [icon in KnowledgeFileIcon]: typeof Pdf } = {
  document: Document,
  docx: Docx,
  html: Html,
  pdf: Pdf,
  pptx: Pptx,
  txt: Txt,
};

/** The document's format as its file icon; the format's name is what a screen reader hears. */
export function KnowledgeTypeIcon({
  className = '',
  size = 24,
  source,
}: {
  className?: string;
  size?: number;
  source: Pick<KnowledgeSource, 'kind' | 'mimeType'>;
}): JSX.Element {
  const format = getKnowledgeFormat(source);
  const Icon = FILE_ICONS[format.icon];

  return (
    <span
      aria-label={format.label}
      className={`fk:flex fk:shrink-0 fk:items-center fk:justify-center ${className}`}
      data-knowledge-type={format.icon}
      role="img"
    >
      <Icon size={size} />
    </span>
  );
}

/** The larger file icon of the document page and the record panel: the same icon as the list, at 40px. */
export function SourceIcon({ source }: { source: Pick<KnowledgeSource, 'kind' | 'mimeType'> }): JSX.Element {
  return <KnowledgeTypeIcon size={40} source={source} />;
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
  isBusy = false,
  onOpen,
  onRemoved,
  source,
  trigger = 'row',
}: {
  /** Another action on the document is in flight; removing waits for it. */
  isBusy?: boolean;
  /** Offered as the first item when given (the document page is already open). */
  onOpen?: () => void;
  /** The document is gone: drop it from the list, or leave its page. The list invalidation is done here. */
  onRemoved: () => void;
  source: KnowledgeSource;
  /** How the button looks: a quiet icon in a row or card, an outlined one next to page actions. */
  trigger?: 'row' | 'page';
}): JSX.Element | null {
  const { api, projectId } = useProjectKnowledge();
  const canMutate = useCanMutate();
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  if (!api || !projectId) {
    return null;
  }

  const knowledgeApi = api;

  async function remove(): Promise<void> {
    setIsRemoving(true);

    try {
      await knowledgeApi.deleteSource(source.id);
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
