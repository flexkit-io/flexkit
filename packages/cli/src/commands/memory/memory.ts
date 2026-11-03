/** Pure helpers for `flexkit memory`, unit-tested in tests/memory.test.ts. */

/** The server's limit, used when an older server does not report `maxLength`. */
export const DEFAULT_MAX_MEMORY_LENGTH = 20_000;
export const MAX_PREFERRED_NAME_LENGTH = 100;

export interface MemoryDocument {
  content: string;
  preferredName: string | null;
  updatedAt: string | null;
}

/** `GET /agent/memory` and `PUT /agent/memory`. */
export interface MemoryResponse {
  companyMemories: string[];
  maxLength?: number;
  memory: MemoryDocument;
}

export type MemoryUpdate = {
  content: string;
  preferredName?: string;
};

/**
 * Builds the `PUT /agent/memory` body, or returns the problem to report.
 * A blank `--name` is refused: the server would keep the old name anyway.
 */
export function buildMemoryUpdate(
  content: string,
  preferredName: string | undefined,
  maxLength = DEFAULT_MAX_MEMORY_LENGTH
): { body: MemoryUpdate } | { error: string } {
  if (content.length > maxLength) {
    return {
      error: `The memory is limited to ${maxLength.toLocaleString('en-US')} characters; this one has ${content.length.toLocaleString('en-US')}.`,
    };
  }

  if (preferredName === undefined) {
    return { body: { content } };
  }

  const name = preferredName.trim();

  if (!name) {
    return { error: '--name needs a value. Omit it to keep the stored name.' };
  }

  if (name.length > MAX_PREFERRED_NAME_LENGTH) {
    return { error: `--name is limited to ${String(MAX_PREFERRED_NAME_LENGTH)} characters.` };
  }

  return { body: { content, preferredName: name } };
}

/** `1,234 / 20,000 characters` */
export function formatMemorySize(content: string, maxLength = DEFAULT_MAX_MEMORY_LENGTH): string {
  return `${content.length.toLocaleString('en-US')} / ${maxLength.toLocaleString('en-US')} characters`;
}

/** The editor `flexkit memory edit` opens: $VISUAL, then $EDITOR, then vi (notepad on Windows). */
export function resolveEditor(env: { [key: string]: string | undefined }, platform: string = process.platform): string {
  const configured = env.VISUAL?.trim() || env.EDITOR?.trim();

  if (configured) {
    return configured;
  }

  return platform === 'win32' ? 'notepad' : 'vi';
}

/** Quotes a path for the shell that runs the editor command (`code --wait`, `vim`, …). */
export function shellQuote(value: string, platform: string = process.platform): string {
  if (platform === 'win32') {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Editors add or drop a final newline; that alone is not a change. */
export function isMemoryChanged(before: string, after: string): boolean {
  return before.replace(/\s+$/, '') !== after.replace(/\s+$/, '');
}
