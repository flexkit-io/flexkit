/**
 * Types and pure helpers of the Knowledge section: documents the team adds
 * so the agent can search and cite them. Everything here runs without React
 * so the list and detail pages stay thin and the rules are unit-tested.
 */

export type KnowledgeSourceKind = 'upload' | 'url';

export type KnowledgeSourceStatus = 'processing' | 'ready' | 'failed';

export type KnowledgeVersionStatus = 'processing' | 'published' | 'retired' | 'failed';

export type KnowledgeJobState =
  | 'queued'
  | 'extracting'
  | 'embedding'
  | 'publishing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface KnowledgeLocator {
  page?: number;
  slide?: number;
  headingPath?: string[];
  charStart: number;
  charEnd: number;
}

export interface KnowledgeVersion {
  id: string;
  status: KnowledgeVersionStatus;
  sha256: string | null;
  extractionVersion: number;
  passageCount: number;
  warnings: string[];
  error: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  kind: KnowledgeSourceKind;
  originUrl: string | null;
  mimeType: string;
  path: string | null;
  size: number | null;
  sha256: string | null;
  /** Space codes that may read the source; empty means every project member. */
  spaces: string[];
  agentVisible: boolean;
  status: KnowledgeSourceStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** The published version, or the newest one while the first ingestion runs. */
  currentVersion: KnowledgeVersion | null;
  /** The opening of the document's text, carried by listings for the grid's cards. */
  preview?: string | null;
  /** When the list was searched: whether the title or the content matched. */
  matchedIn?: 'title' | 'content' | null;
}

export interface KnowledgeJobProgress {
  phase: KnowledgeJobState;
  message?: string;
  passageCount?: number;
  embeddedCount?: number;
  warnings?: string[];
}

export interface KnowledgeJobError {
  code: string;
  message: string;
  hint?: string;
}

export interface KnowledgeJob {
  id: string;
  sourceId: string;
  versionId: string;
  state: KnowledgeJobState;
  progress: KnowledgeJobProgress | null;
  error: KnowledgeJobError | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface KnowledgePassage {
  id: string;
  order: number;
  text: string;
  locator: KnowledgeLocator;
}

export interface KnowledgeSourcesList {
  count: number;
  hasMore: boolean;
  sources: KnowledgeSource[];
}

export interface KnowledgeSourceDetail {
  job: KnowledgeJob | null;
  source: KnowledgeSource;
}

export interface KnowledgePassagesPage {
  passages: KnowledgePassage[];
  source: { id: string; title: string };
  total: number;
  version: { id: string; passageCount: number };
}

/** A record a document is attached to, as the platform lists it. */
export interface KnowledgeLink {
  entity: string;
  entityPlural: string;
  recordId: string;
  /** The record's display value when the platform could read it; null when the Studio must resolve it. */
  title: string | null;
  createdAt: string;
}

/** An entity type a document applies to: every record of the type inherits it. */
export interface KnowledgeEntityLink {
  entity: string;
  entityPlural: string;
}

export interface KnowledgeLinksList {
  links: KnowledgeLink[];
  entities: KnowledgeEntityLink[];
}

export interface KnowledgeRecordSources {
  /** Attached to the record itself. */
  sources: KnowledgeSource[];
  /** Attached to the record's entity type (and not to the record). */
  inherited: KnowledgeSource[];
}

export interface KnowledgeEntitySources {
  sources: KnowledgeSource[];
}

export interface KnowledgeRecordRef {
  entity: string;
  recordId: string;
}

/** What a document is attached to: a record, or every record of the entity when `recordId` is absent. */
export interface KnowledgeLinkTarget {
  entity: string;
  recordId?: string;
}

export interface KnowledgeSourcePatch {
  agentVisible?: boolean;
  spaces?: string[];
  title?: string;
}

/** What registering a document returns: queued for indexing, or already present. */
export type RegisterKnowledgeSourceResult =
  | { duplicate: true; source: KnowledgeSource }
  | { duplicate?: false; job: KnowledgeJob; source: KnowledgeSource; version: KnowledgeVersion };

export const KNOWLEDGE_MAX_FILE_BYTES = 20 * 1024 * 1024;

export const KNOWLEDGE_MAX_TITLE_LENGTH = 200;

/** Passages the API returns per page of a source. */
export const KNOWLEDGE_PASSAGES_PAGE_SIZE = 20;

const KNOWLEDGE_EXTENSIONS = ['pdf', 'docx', 'pptx', 'md', 'markdown', 'txt', 'html', 'htm'] as const;

/** Value of the file input's `accept` attribute. */
export const KNOWLEDGE_ACCEPT = KNOWLEDGE_EXTENSIONS.map((extension) => `.${extension}`).join(',');

export const KNOWLEDGE_FORMATS_LABEL = 'PDF, Word, PowerPoint, Markdown, text or HTML';

const KNOWLEDGE_EXTENSION_SET: ReadonlySet<string> = new Set(KNOWLEDGE_EXTENSIONS);

function getExtension(filename: string): string | null {
  const match = /\.([a-z0-9]{1,8})$/i.exec(filename.trim());

  return match ? match[1]!.toLowerCase() : null;
}

/** Why a file cannot be added, or null when it can; mirrors the server rules so the user hears it before uploading. */
export function getKnowledgeFileProblem(file: { name: string; size: number }): string | null {
  const extension = getExtension(file.name);

  if (!extension || !KNOWLEDGE_EXTENSION_SET.has(extension)) {
    return `${file.name} is not a supported document. Add ${KNOWLEDGE_FORMATS_LABEL} files.`;
  }

  if (file.size <= 0) {
    return `${file.name} is empty.`;
  }

  if (file.size > KNOWLEDGE_MAX_FILE_BYTES) {
    return `${file.name} is larger than ${formatFileSize(KNOWLEDGE_MAX_FILE_BYTES)}.`;
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/** A public page address the server will accept: https, no credentials, hash dropped. */
export function parseKnowledgeUrl(value: string): { error: string } | { url: string } {
  const trimmed = value.trim();

  if (!trimmed) {
    return { error: 'Enter the address of a public page.' };
  }

  let url: URL;

  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { error: 'Enter a valid address, for example https://example.com/handbook' };
  }

  if (url.protocol !== 'https:') {
    return { error: 'The address must use HTTPS.' };
  }

  if (url.username || url.password) {
    return { error: 'The address cannot include credentials.' };
  }

  url.hash = '';

  return { url: url.toString() };
}

/** The Untitled UI file icon drawn for a format (see `KnowledgeTypeIcon`). */
export type KnowledgeFileIcon = 'pdf' | 'docx' | 'pptx' | 'document' | 'txt' | 'html';

export interface KnowledgeFormat {
  /** How people call the format: "PDF", "Word", "Web page". */
  label: string;
  icon: KnowledgeFileIcon;
}

const WEB_PAGE_FORMAT: KnowledgeFormat = { icon: 'html', label: 'Web page' };
const TEXT_FORMAT: KnowledgeFormat = { icon: 'txt', label: 'Text' };

/** The formats the platform indexes, by media type; anything else it accepts reads as text. */
export const KNOWLEDGE_FORMATS: { readonly [mimeType: string]: KnowledgeFormat } = {
  'application/pdf': { icon: 'pdf', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'docx', label: 'Word' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: 'pptx', label: 'PowerPoint' },
  'text/markdown': { icon: 'document', label: 'Markdown' },
  'text/html': { icon: 'html', label: 'HTML' },
  'text/plain': TEXT_FORMAT,
};

/** The format of a document: a web page by its kind, else by its media type. */
export function getKnowledgeFormat(source: Pick<KnowledgeSource, 'kind' | 'mimeType'>): KnowledgeFormat {
  if (source.kind === 'url') {
    return WEB_PAGE_FORMAT;
  }

  return KNOWLEDGE_FORMATS[source.mimeType] ?? TEXT_FORMAT;
}

export function getKnowledgeKindLabel(source: Pick<KnowledgeSource, 'kind' | 'mimeType'>): string {
  return getKnowledgeFormat(source).label;
}

export type KnowledgeStatusTone = 'muted' | 'ready' | 'busy' | 'error';

export interface KnowledgeStatusSummary {
  /** Short badge text. */
  label: string;
  /** One line under the title. */
  detail: string;
  tone: KnowledgeStatusTone;
}

export function isKnowledgeJobActive(job: KnowledgeJob | null | undefined): boolean {
  return Boolean(
    job &&
    (job.state === 'queued' || job.state === 'extracting' || job.state === 'embedding' || job.state === 'publishing')
  );
}

/** Whether the source changes on its own right now, so the page should poll. */
export function isKnowledgeSourceBusy(source: Pick<KnowledgeSource, 'status'>, job?: KnowledgeJob | null): boolean {
  return source.status === 'processing' || isKnowledgeJobActive(job);
}

function describeJobPhase(job: KnowledgeJob): string {
  const { progress } = job;

  switch (job.state) {
    case 'queued':
      return 'Waiting to be processed';
    case 'extracting':
      return 'Reading the document';
    case 'embedding': {
      if (progress?.passageCount) {
        return `Indexing passages (${String(progress.embeddedCount ?? 0)} of ${String(progress.passageCount)})`;
      }

      return 'Indexing passages';
    }
    case 'publishing':
      return 'Publishing';
    default:
      return progress?.message ?? job.state;
  }
}

/**
 * One status for the list row and the detail header. A source keeps serving
 * its published version while a re-index runs or fails, so the badge speaks
 * about the document, and the detail line about what is happening to it.
 */
export function summarizeKnowledgeStatus(source: KnowledgeSource, job?: KnowledgeJob | null): KnowledgeStatusSummary {
  const version = source.currentVersion;
  const published = version?.status === 'published';
  const passages = version?.passageCount ?? 0;
  const readyDetail = `${String(passages)} ${passages === 1 ? 'passage' : 'passages'}`;

  if (isKnowledgeJobActive(job)) {
    return {
      label: published ? 'Re-indexing' : 'Indexing',
      detail: describeJobPhase(job!),
      tone: 'busy',
    };
  }

  if (source.status === 'failed' || (!published && (job?.state === 'failed' || version?.status === 'failed'))) {
    const message = job?.error?.message ?? version?.error ?? 'Indexing failed';

    return { label: 'Failed', detail: message, tone: 'error' };
  }

  if (source.status === 'processing' || !published) {
    return { label: 'Indexing', detail: 'Waiting to be processed', tone: 'busy' };
  }

  if (job?.state === 'failed') {
    return {
      label: 'Ready',
      detail: `${readyDetail} · the last re-index failed: ${job.error?.message ?? 'unknown error'}`,
      tone: 'ready',
    };
  }

  if (version && version.warnings.length > 0) {
    return { label: 'Ready', detail: `${readyDetail} · indexed with warnings`, tone: 'ready' };
  }

  return { label: 'Ready', detail: readyDetail, tone: 'ready' };
}

/** Where a passage sits, the way a citation reads: "p. 3 · Returns › Window". */
export function formatKnowledgeLocator(locator: KnowledgeLocator): string {
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

/** Splits a stored warning such as "TEXT_TRUNCATED: only the first…" into readable text. */
export function formatKnowledgeWarning(warning: string): string {
  const [, captured] = /^[A-Z_]+:\s*(.*)$/.exec(warning) ?? [];
  const text = captured ?? warning;

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The spaces a source will carry after toggling one; empty means every member. */
export function toggleSpaceCode(current: string[], code: string): string[] {
  return current.includes(code) ? current.filter((entry) => entry !== code) : [...current, code];
}

/** The document page in the Knowledge app; absolute so it works from any app. */
export function getKnowledgeSourcePath(projectId: string, sourceId: string): string {
  return `/${encodeURIComponent(projectId)}/knowledge/${encodeURIComponent(sourceId)}`;
}

/**
 * What a linked record is called: the label the Studio resolved from the
 * record itself, else what the platform could read, else a shortened id so
 * the row still identifies the record.
 */
export function getKnowledgeLinkLabel(
  link: Pick<KnowledgeLink, 'recordId' | 'title'>,
  resolved?: string | null
): string {
  const text = resolved?.trim() || (link.title ?? '').trim();

  if (text) {
    return text;
  }

  return link.recordId.length > 12 ? `${link.recordId.slice(0, 8)}…` : link.recordId;
}

export interface KnowledgeLinkGroup {
  entity: string;
  entityPlural: string;
  links: KnowledgeLink[];
}

/** Links grouped per entity in first-seen order, so each group resolves its labels with one query. */
export function groupKnowledgeLinks(links: KnowledgeLink[]): KnowledgeLinkGroup[] {
  const groups = new Map<string, KnowledgeLinkGroup>();

  for (const link of links) {
    let group = groups.get(link.entityPlural);

    if (!group) {
      group = { entity: link.entity, entityPlural: link.entityPlural, links: [] };
      groups.set(link.entityPlural, group);
    }

    group.links.push(link);
  }

  return [...groups.values()];
}

/** The documents a picker may still attach to a record: the ones not attached yet, usable ones first. */
export function getAttachableSources(sources: KnowledgeSource[], attachedIds: Iterable<string>): KnowledgeSource[] {
  const attached = new Set(attachedIds);

  return sources
    .filter((source) => !attached.has(source.id))
    .sort((a, b) => Number(b.status === 'ready') - Number(a.status === 'ready'));
}

/** Whether documents may be attached to the entity: built-in ones (assets, tags) are not something a document is about. */
export function isKnowledgeLinkableEntity(entityName: string): boolean {
  return !entityName.startsWith('_');
}

/** The deployed entity with this name, if the Studio knows it. */
export function findEntityByName<T extends { name: string }>(schema: T[], entityName: string): T | undefined {
  return schema.find((entity) => entity.name === entityName);
}

/** How an entity type is called in the Knowledge views: its sidebar label, else its plural. */
export function getEntityLinkLabel(entity: { menu?: { label?: string }; plural: string }): string {
  return entity.menu?.label?.trim() || entity.plural;
}

/**
 * The entity types a document can still be attached to: the project's own
 * entities (built-in ones such as assets and tags are not something a
 * document is about) minus the ones already linked, by label.
 */
export function getLinkableEntities<T extends { menu?: { label?: string }; name: string; plural: string }>(
  schema: T[],
  linked: Iterable<Pick<KnowledgeEntityLink, 'entity'>>
): T[] {
  const taken = new Set([...linked].map((link) => link.entity));

  return schema
    .filter((entity) => isKnowledgeLinkableEntity(entity.name) && !taken.has(entity.name))
    .sort((a, b) => getEntityLinkLabel(a).localeCompare(getEntityLinkLabel(b)));
}

export type KnowledgeViewMode = 'list' | 'grid';

const VIEW_MODE_STORAGE_KEY = 'flexkit-knowledge:viewMode';

/** The list is the default; the choice is remembered per browser, like the asset manager's. */
export function getStoredKnowledgeViewMode(): KnowledgeViewMode {
  try {
    const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(VIEW_MODE_STORAGE_KEY);

    return stored === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

export function setStoredKnowledgeViewMode(mode: KnowledgeViewMode): void {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice lasts for the session only.
  }
}
