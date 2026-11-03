/**
 * Pure helpers for `flexkit skills`: Markdown files with front matter, file
 * names, and the plan `skills push` applies. Nothing here touches the network
 * or the file system, so it is unit tested directly.
 */

export type SkillVisibility = 'project' | 'space' | 'personal';
export type SkillSource = 'studio' | 'code' | 'plugin';

/** A skill as the `/skills` routes return it. */
export interface SkillDto {
  content: string;
  createdAt: string;
  createdBy: string;
  description: string;
  id: string;
  logoUrl: string | null;
  name: string;
  projectId: string;
  source: SkillSource;
  spaceId: string | null;
  updatedAt: string;
  visibility: SkillVisibility;
}

/** The body the POST and PATCH routes accept; PATCH replaces every field. */
export interface SkillInput {
  content: string;
  description: string;
  name: string;
  spaceId: string | null;
  visibility: SkillVisibility;
}

export const SKILL_VISIBILITIES: SkillVisibility[] = ['project', 'space', 'personal'];

/** Limits enforced by the API (lib/skills/limits.ts). */
export const MAX_SKILL_NAME_LENGTH = 120;
export const MAX_SKILL_DESCRIPTION_LENGTH = 1024;
export const MAX_SKILL_CONTENT_LENGTH = 50_000;

export interface FrontMatterDocument {
  /** Front matter keys with string values (other YAML is not supported). */
  data: Record<string, string>;
  body: string;
  /** Whether the text started with a `---` block. */
  hasFrontMatter: boolean;
}

function unquote(raw: string, line: number): string {
  const value = raw.trim();

  if (value.startsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      throw new Error(`Front matter line ${String(line)}: invalid double-quoted string.`);
    }
  }

  if (value.startsWith("'")) {
    if (!value.endsWith("'") || value.length < 2) {
      throw new Error(`Front matter line ${String(line)}: unterminated single-quoted string.`);
    }

    return value.slice(1, -1).replace(/''/g, "'");
  }

  // A plain scalar ends at a ` #` comment.
  const comment = value.search(/\s#/);

  return (comment >= 0 ? value.slice(0, comment) : value).trim();
}

/**
 * Splits `---` front matter from a Markdown document. Supports the subset of
 * YAML skill files need: `key: value` with plain, single- or double-quoted
 * scalars, `|` / `>` block scalars, blank lines and `#` comments.
 */
export function parseFrontMatter(text: string): FrontMatterDocument {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  if (lines[0]?.trim() !== '---') {
    return { data: {}, body: normalized, hasFrontMatter: false };
  }

  const end = lines.findIndex((line, index) => index > 0 && (line.trim() === '---' || line.trim() === '...'));

  if (end < 0) {
    throw new Error('The front matter starts with --- but is never closed.');
  }

  const data: Record<string, string> = {};
  let index = 1;

  while (index < end) {
    const line = lines[index] as string;
    const lineNumber = index + 1;

    if (!line.trim() || line.trimStart().startsWith('#')) {
      index += 1;
      continue;
    }

    const match = /^([A-Za-z_][\w-]*)\s*:(.*)$/.exec(line);

    if (!match) {
      throw new Error(`Front matter line ${String(lineNumber)}: expected "key: value".`);
    }

    const key = match[1] as string;
    const rest = (match[2] as string).trim();
    const block = /^([|>])([+-]?)$/.exec(rest);

    if (block) {
      const blockLines: string[] = [];
      let indent: number | null = null;

      index += 1;

      while (index < end) {
        const next = lines[index] as string;

        if (next.trim() === '') {
          blockLines.push('');
          index += 1;
          continue;
        }

        const nextIndent = next.length - next.trimStart().length;

        if (nextIndent === 0) {
          break;
        }

        indent ??= nextIndent;
        blockLines.push(next.slice(Math.min(indent, nextIndent)));
        index += 1;
      }

      while (blockLines.length > 0 && blockLines[blockLines.length - 1] === '') {
        blockLines.pop();
      }

      data[key] = block[1] === '|' ? blockLines.join('\n') : foldLines(blockLines);
      continue;
    }

    data[key] = unquote(rest, lineNumber);
    index += 1;
  }

  const body = lines
    .slice(end + 1)
    .join('\n')
    .replace(/^\n+/, '');

  return { data, body, hasFrontMatter: true };
}

/** YAML folding: single newlines become spaces, blank lines stay paragraph breaks. */
function foldLines(lines: string[]): string {
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line === '') {
      paragraphs.push(current.join(' '));
      current = [];
    } else {
      current.push(line);
    }
  }

  paragraphs.push(current.join(' '));

  return paragraphs.join('\n');
}

/** Quotes a front matter value only when a plain YAML scalar would change it. */
export function formatFrontMatterValue(value: string): string {
  const plainSafe =
    value !== '' &&
    value === value.trim() &&
    !/[\n\r\t]/.test(value) &&
    !/^[-?:,[\]{}#&*!|>'"%@`]/.test(value) &&
    !/: |\s#|:$/.test(value) &&
    !/^(true|false|yes|no|on|off|null|~)$/i.test(value) &&
    !/^[-+.]?\d/.test(value);

  return plainSafe ? value : JSON.stringify(value);
}

/** Writes a Markdown document with front matter; keys with empty values are left out. */
export function serializeFrontMatter(data: [string, string | null | undefined][], body: string): string {
  const lines = data
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
    .map(([key, value]) => `${key}: ${formatFrontMatterValue(value)}`);

  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`;
}

/** The file `skills pull` writes for a skill. */
export function skillToMarkdown(
  skill: Pick<SkillDto, 'id' | 'name' | 'description' | 'visibility' | 'spaceId' | 'content'>
): string {
  return serializeFrontMatter(
    [
      ['id', skill.id],
      ['name', skill.name],
      ['description', skill.description],
      ['visibility', skill.visibility],
      ['space', skill.visibility === 'space' ? skill.spaceId : null],
    ],
    skill.content
  );
}

/** A skill read from a Markdown file. Missing fields stay undefined so callers can fill them. */
export interface LocalSkill {
  /** Where it came from, for messages. */
  file: string;
  id?: string;
  name?: string;
  description?: string;
  visibility?: SkillVisibility;
  spaceId?: string;
  content: string;
}

export function parseVisibility(value: string | undefined, where: string): SkillVisibility | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (!SKILL_VISIBILITIES.includes(value as SkillVisibility)) {
    throw new Error(`${where}: visibility must be one of ${SKILL_VISIBILITIES.join(', ')} (got "${value}").`);
  }

  return value as SkillVisibility;
}

/** Reads a skill Markdown file: front matter `id`, `name`, `description`, `visibility`, `space`, then the content. */
export function parseSkillMarkdown(text: string, file: string): LocalSkill {
  const { data, body } = parseFrontMatter(text);
  const string = (key: string): string | undefined => {
    const value = data[key]?.trim();

    return value ? value : undefined;
  };

  return {
    file,
    id: string('id'),
    name: string('name'),
    description: string('description'),
    visibility: parseVisibility(string('visibility'), file),
    spaceId: string('space') ?? string('spaceId'),
    content: body.trim(),
  };
}

/** `Refund Policy (EU)` → `refund-policy-eu`; plugin skills `shopify/orders` → `shopify-orders`. */
export function slugifySkillName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

  return slug || 'skill';
}

/** The skill name a file name implies: `refund-policy.md` → `refund-policy`. */
export function nameFromFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;

  return base.replace(/\.(md|markdown|mdx)$/i, '');
}

/** Checks the fields the API validates, so `push --dry-run` reports problems before any request. */
export function validateSkillInput(input: SkillInput): string[] {
  const errors: string[] = [];

  if (!input.name) {
    errors.push('name is required');
  } else if (input.name.length > MAX_SKILL_NAME_LENGTH) {
    errors.push(`name is longer than ${String(MAX_SKILL_NAME_LENGTH)} characters`);
  }

  if (!input.description) {
    errors.push('description is required so the agent knows when to load the skill');
  } else if (input.description.length > MAX_SKILL_DESCRIPTION_LENGTH) {
    errors.push(`description is longer than ${String(MAX_SKILL_DESCRIPTION_LENGTH)} characters`);
  }

  if (!input.content) {
    errors.push('content is empty');
  } else if (input.content.length > MAX_SKILL_CONTENT_LENGTH) {
    errors.push(`content is longer than ${String(MAX_SKILL_CONTENT_LENGTH)} characters`);
  }

  if (input.visibility === 'space' && !input.spaceId) {
    errors.push('a space-scoped skill needs `space: <spaceId>`');
  }

  return errors;
}

/** Merges a local file over a remote skill (or the defaults for a new one) into a full API body. */
export function toSkillInput(local: LocalSkill, remote?: SkillDto): SkillInput {
  const visibility = local.visibility ?? remote?.visibility ?? 'project';

  return {
    name: local.name ?? remote?.name ?? nameFromFilename(local.file),
    description: local.description ?? remote?.description ?? '',
    content: local.content,
    visibility,
    spaceId: visibility === 'space' ? (local.spaceId ?? remote?.spaceId ?? null) : null,
  };
}

export function isSameSkill(input: SkillInput, remote: SkillDto): boolean {
  return (
    input.name === remote.name &&
    input.description === remote.description.trim() &&
    input.content === remote.content.trim() &&
    input.visibility === remote.visibility &&
    (input.visibility !== 'space' || input.spaceId === remote.spaceId)
  );
}

export type PushAction =
  | { type: 'create'; file: string; input: SkillInput }
  | { type: 'update'; file: string; input: SkillInput; remote: SkillDto }
  | { type: 'unchanged'; file: string; remote: SkillDto }
  | { type: 'skip'; file: string; reason: string; remote?: SkillDto }
  | { type: 'invalid'; file: string; errors: string[] }
  | { type: 'delete'; remote: SkillDto };

export interface PushPlan {
  actions: PushAction[];
  /** Studio skills no file matched; deleted only with `--prune`. */
  unmatched: SkillDto[];
}

function describeSource(source: SkillSource): string {
  return source === 'plugin' ? 'a plugin' : 'code (flexkit.tools.ts)';
}

/**
 * Decides what `skills push` does with each local file. A file matches a
 * remote skill by its `id` front matter first, then by name (case-insensitive,
 * as the API treats names). Skills from code or plugins are never written:
 * code skills sync from flexkit.tools.ts and plugin skills update with their
 * plugin. Remote Studio skills no file matched are deleted only with `prune`.
 */
export function planSkillPush(locals: LocalSkill[], remotes: SkillDto[], options: { prune?: boolean } = {}): PushPlan {
  const actions: PushAction[] = [];
  const byId = new Map(remotes.map((skill) => [skill.id, skill]));
  const byName = new Map<string, SkillDto[]>();
  const matched = new Set<string>();
  const seenNames = new Map<string, string>();

  for (const skill of remotes) {
    const key = skill.name.toLowerCase();

    byName.set(key, [...(byName.get(key) ?? []), skill]);
  }

  for (const local of locals) {
    let remote = local.id ? byId.get(local.id) : undefined;

    if (!remote) {
      const name = (local.name ?? nameFromFilename(local.file)).toLowerCase();
      const candidates = byName.get(name) ?? [];

      remote = candidates.find((skill) => skill.source === 'studio' && !matched.has(skill.id)) ?? candidates[0];
    }

    const input = toSkillInput(local, remote);
    const nameKey = input.name.toLowerCase();
    const duplicateOf = seenNames.get(nameKey);

    if (duplicateOf) {
      actions.push({ type: 'invalid', file: local.file, errors: [`uses the same name as ${duplicateOf}`] });
      continue;
    }

    seenNames.set(nameKey, local.file);

    if (remote && remote.source !== 'studio') {
      matched.add(remote.id);
      actions.push({
        type: 'skip',
        file: local.file,
        remote,
        reason: `"${remote.name}" is managed by ${describeSource(remote.source)}`,
      });
      continue;
    }

    const errors = validateSkillInput(input);

    if (errors.length > 0) {
      actions.push({ type: 'invalid', file: local.file, errors });
      continue;
    }

    if (!remote) {
      actions.push({ type: 'create', file: local.file, input });
      continue;
    }

    if (matched.has(remote.id)) {
      actions.push({
        type: 'invalid',
        file: local.file,
        errors: [`matches the same skill as another file (${remote.id})`],
      });
      continue;
    }

    matched.add(remote.id);

    // A rename onto a name another skill already uses would be refused by the API.
    const clash = (byName.get(nameKey) ?? []).find((skill) => skill.id !== remote.id);

    if (clash && input.name !== remote.name) {
      actions.push({
        type: 'skip',
        file: local.file,
        remote,
        reason: `cannot rename to "${input.name}": the name is used by ${clash.source === 'studio' ? `skill ${clash.id}` : describeSource(clash.source)}`,
      });
      continue;
    }

    actions.push(
      isSameSkill(input, remote)
        ? { type: 'unchanged', file: local.file, remote }
        : { type: 'update', file: local.file, input, remote }
    );
  }

  const unmatched = remotes.filter((skill) => skill.source === 'studio' && !matched.has(skill.id));

  if (options.prune) {
    actions.push(...unmatched.map((remote): PushAction => ({ type: 'delete', remote })));
  }

  return { actions, unmatched };
}

/**
 * Picks a file name for each skill `skills pull` writes. A skill keeps the
 * file that already holds its id (so renames do not leave a stale copy), else
 * a file without an id that holds its name (`existingNames`, keyed by the
 * lowercased name); others get `<slug>.md`, with `-2`, `-3`… when two names
 * slugify alike.
 */
export function assignPullFilenames(
  skills: Pick<SkillDto, 'id' | 'name'>[],
  existingIds: Map<string, string>,
  existingNames: Map<string, string> = new Map()
): Map<string, string> {
  const result = new Map<string, string>();
  const taken = new Set<string>();
  const claimed = new Set([...existingIds.values()].map((file) => file.toLowerCase()));

  for (const skill of skills) {
    let existing = existingIds.get(skill.id);

    if (!existing) {
      const byName = existingNames.get(skill.name.toLowerCase());

      if (byName && !claimed.has(byName.toLowerCase())) {
        existing = byName;
        claimed.add(byName.toLowerCase());
      }
    }

    if (existing) {
      result.set(skill.id, existing);
      taken.add(existing.toLowerCase());
    }
  }

  // Other files in the folder are never overwritten by a new skill.
  for (const file of [...existingIds.values(), ...existingNames.values()]) {
    taken.add(file.toLowerCase());
  }

  for (const skill of skills) {
    if (result.has(skill.id)) {
      continue;
    }

    const slug = slugifySkillName(skill.name);
    let candidate = `${slug}.md`;

    for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) {
      candidate = `${slug}-${String(n)}.md`;
    }

    taken.add(candidate.toLowerCase());
    result.set(skill.id, candidate);
  }

  return result;
}
