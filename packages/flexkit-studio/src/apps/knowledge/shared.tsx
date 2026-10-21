import type { JSX } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { FileTextIcon, GlobeIcon, LoaderCircle } from 'lucide-react';
import { mutate as mutateGlobal } from 'swr';
import { useConfig } from '../../core/config/config-context';
import { Badge, toast } from '../../ui';
import { createKnowledgeApi, isKnowledgeListKey, KnowledgeApiError, type KnowledgeApi } from './api';
import type { KnowledgeSource, KnowledgeStatusTone, RegisterKnowledgeSourceResult } from './knowledge';

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
