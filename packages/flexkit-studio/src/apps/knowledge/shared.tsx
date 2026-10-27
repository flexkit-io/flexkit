import type { JSX } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { FileTextIcon, GlobeIcon, LoaderCircle } from 'lucide-react';
import { mutate as mutateGlobal } from 'swr';
import { useConfig } from '../../core/config/config-context';
import { Badge, toast } from '../../ui';
import {
  createKnowledgeApi,
  isKnowledgeLinkKey,
  isKnowledgeListKey,
  KnowledgeApiError,
  type KnowledgeApi,
} from './api';
import {
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

  return (
    <span
      aria-label={badge.code}
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
