/**
 * Pure helpers behind the knowledge events in a chat or run replay: the
 * Search Knowledge card with its citations and the Read Source status line.
 * Kept free of React so the grouping and labels are unit-tested.
 */
import type { ReplayDataParts } from './replay';

export { getKnowledgeSourcePath } from '../knowledge/knowledge';

export type KnowledgeCitation = NonNullable<ReplayDataParts['knowledge-search']['results']>[number];

export interface CitedPassage {
  excerpt: string;
  /** "p. 3 · Returns › Window", or empty when the passage has no locator. */
  locator: string;
  passageId: string;
}

export interface CitedSource {
  passages: CitedPassage[];
  sourceId: string;
  sourceTitle: string;
}

/** Where a passage sits, the way a citation reads. */
export function formatCitationLocator(locator: KnowledgeCitation['locator']): string {
  const parts: string[] = [];

  if (locator.page !== undefined) {
    parts.push(`p. ${String(locator.page)}`);
  }

  if (locator.slide !== undefined) {
    parts.push(`slide ${String(locator.slide)}`);
  }

  if (locator.headingPath && locator.headingPath.length > 0) {
    parts.push(locator.headingPath.join(' › '));
  }

  return parts.join(' · ');
}

/** One entry per source in first-hit order, each with its passages in rank order; duplicate passages collapse. */
export function groupCitationsBySource(results: KnowledgeCitation[] | undefined): CitedSource[] {
  const sources = new Map<string, CitedSource>();

  for (const citation of results ?? []) {
    let source = sources.get(citation.sourceId);

    if (!source) {
      source = { passages: [], sourceId: citation.sourceId, sourceTitle: citation.sourceTitle };
      sources.set(citation.sourceId, source);
    }

    if (source.passages.some((passage) => passage.passageId === citation.passageId)) {
      continue;
    }

    source.passages.push({
      excerpt: citation.excerpt,
      locator: formatCitationLocator(citation.locator),
      passageId: citation.passageId,
    });
  }

  return [...sources.values()];
}

/** Header of the search card once it finished, from the citations already grouped per document. */
export function summarizeKnowledgeSearch(query: string, sources: CitedSource[]): string {
  const passages = sources.reduce((total, source) => total + source.passages.length, 0);

  if (passages === 0) {
    return `No passages matched "${query}"`;
  }

  return `${String(passages)} ${passages === 1 ? 'passage' : 'passages'} from ${String(sources.length)} ${
    sources.length === 1 ? 'document' : 'documents'
  } for "${query}"`;
}
