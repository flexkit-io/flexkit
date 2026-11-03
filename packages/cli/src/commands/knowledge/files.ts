/**
 * Pure helpers for `flexkit knowledge`: which inputs can be added, link
 * targets, download file names and passage locations. Kept free of network
 * and Client access so they are unit tested directly.
 */

/** Mirrors KNOWLEDGE_MEDIA_TYPE_BY_EXTENSION in the platform; the server decides by extension. */
export const KNOWLEDGE_MEDIA_TYPE_BY_EXTENSION: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
  html: 'text/html',
  htm: 'text/html',
};

/** The platform's per-file cap (KNOWLEDGE_MAX_FILE_BYTES). */
export const KNOWLEDGE_MAX_FILE_BYTES = 20 * 1024 * 1024;

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

/** The media type the platform accepts for a file name, or null when it is not supported. */
export function knowledgeMediaType(filename: string): string | null {
  const match = /\.([a-z0-9]{1,8})$/i.exec(filename.trim());

  return match ? (KNOWLEDGE_MEDIA_TYPE_BY_EXTENSION[(match[1] as string).toLowerCase()] ?? null) : null;
}

export function isUrlInput(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** A local file found on disk, before it is checked. */
export interface FileCandidate {
  path: string;
  /** Display path, relative to the working directory. */
  label: string;
  size: number;
  /** Named on the command line (not found by walking a folder). */
  explicit: boolean;
}

export type KnowledgeInput =
  | { kind: 'file'; path: string; label: string; size: number; mediaType: string; filename: string }
  | { kind: 'url'; url: string; label: string };

export interface InputPlan {
  inputs: KnowledgeInput[];
  /** Inputs that are left out, with the reason, for a warning; `explicit` when named on the command line. */
  skipped: { label: string; reason: string; explicit: boolean }[];
}

function basename(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

/**
 * Splits what `knowledge add` was given into uploads and URL sources, and the
 * ones to skip: unsupported types, empty or oversized files, plain-http URLs
 * (the platform fetches HTTPS only) and repeats.
 */
export function planKnowledgeInputs(files: FileCandidate[], urls: string[]): InputPlan {
  const inputs: KnowledgeInput[] = [];
  const skipped: InputPlan['skipped'] = [];
  const seen = new Set<string>();

  for (const file of files) {
    if (seen.has(file.path)) {
      continue;
    }

    seen.add(file.path);

    const filename = basename(file.path);
    const mediaType = knowledgeMediaType(filename);

    if (!mediaType) {
      skipped.push({
        label: file.label,
        reason: 'unsupported file type (use PDF, Word, PowerPoint, Markdown, text or HTML)',
        explicit: file.explicit,
      });
      continue;
    }

    if (file.size === 0) {
      skipped.push({ label: file.label, reason: 'the file is empty', explicit: file.explicit });
      continue;
    }

    if (file.size > KNOWLEDGE_MAX_FILE_BYTES) {
      skipped.push({ label: file.label, reason: 'larger than the 20 MB limit', explicit: file.explicit });
      continue;
    }

    inputs.push({ kind: 'file', path: file.path, label: file.label, size: file.size, mediaType, filename });
  }

  for (const url of urls) {
    if (seen.has(url)) {
      continue;
    }

    seen.add(url);

    if (!/^https:\/\//i.test(url)) {
      skipped.push({ label: url, reason: 'only https:// addresses can be added', explicit: true });
      continue;
    }

    inputs.push({ kind: 'url', url, label: url });
  }

  return { inputs, skipped };
}

/** `product:123` → record link; `product` → entity-type link. The record id keeps any further colons. */
export function parseLinkTarget(value: string): { entity: string; recordId?: string } {
  const index = value.indexOf(':');
  const entity = (index < 0 ? value : value.slice(0, index)).trim();
  const recordId = index < 0 ? '' : value.slice(index + 1).trim();

  if (!entity) {
    throw new Error(`Expected <entity>[:<recordId>], got "${value}".`);
  }

  if (index >= 0 && !recordId) {
    throw new Error(`The record id after "${entity}:" is empty. Leave out the colon to link the whole entity type.`);
  }

  return recordId ? { entity, recordId } : { entity };
}

/** The path of a link: `/links/<entity>` or `/links/<entity>/<recordId>`, encoded. */
export function linkPath(sourceId: string, entity: string, recordId?: string): string {
  const base = `/knowledge/sources/${encodeURIComponent(sourceId)}/links/${encodeURIComponent(entity)}`;

  return recordId ? `${base}/${encodeURIComponent(recordId)}` : base;
}

/** The file name in a Content-Disposition header (RFC 6266 `filename*` first), or null. */
export function parseContentDispositionFilename(header: string | null | undefined): string | null {
  if (!header) {
    return null;
  }

  const extended = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);

  if (extended) {
    try {
      return sanitizeFilename(decodeURIComponent((extended[2] as string).trim().replace(/^"|"$/g, '')));
    } catch {
      // Fall back to the plain parameter.
    }
  }

  const quoted = /filename\s*=\s*"((?:[^"\\]|\\.)*)"/i.exec(header);

  if (quoted) {
    return sanitizeFilename((quoted[1] as string).replace(/\\(.)/g, '$1'));
  }

  const plain = /filename\s*=\s*([^;\s]+)/i.exec(header);

  return plain ? sanitizeFilename(plain[1] as string) : null;
}

/** Strips directories and characters that are unsafe in a local file name. */
export function sanitizeFilename(value: string): string | null {
  const name = basename(value)
    // eslint-disable-next-line no-control-regex -- control characters are exactly what must go
    .replace(/[\u0000-\u001f<>:"|?*]/g, '-')
    .trim();

  return name && name !== '.' && name !== '..' ? name : null;
}

/** `p. 3 · Pricing › Discounts` for a passage; empty when nothing is known. */
export function formatLocator(locator: KnowledgeLocator | null | undefined): string {
  if (!locator) {
    return '';
  }

  const parts: string[] = [];

  if (typeof locator.page === 'number') {
    parts.push(`p. ${String(locator.page)}`);
  }

  if (typeof locator.slide === 'number') {
    parts.push(`slide ${String(locator.slide)}`);
  }

  if (locator.headingPath && locator.headingPath.length > 0) {
    parts.push(locator.headingPath.join(' › '));
  }

  return parts.join(' · ');
}

export function isFinishedJobState(state: KnowledgeJobState | string): boolean {
  return state === 'completed' || state === 'failed' || state === 'cancelled';
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) {
    return '';
  }

  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
