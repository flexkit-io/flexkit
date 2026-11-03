import { formatRelativeTime } from '../../util/output/format';

/** Roles a project API token can have; owner tokens are never handed out. */
export const TOKEN_ROLES = ['viewer', 'editor', 'contributor', 'developer'] as const;
export type TokenRole = (typeof TOKEN_ROLES)[number];

export interface TokenSpace {
  code: string;
  label: string;
}

export interface TokenDto {
  id: number;
  name: string;
  role: string;
  created_at: string;
  /** The secret, only in the response that creates the token. */
  value?: string;
  last_digits?: string;
  created_by_name?: string;
  spaces: TokenSpace[];
}

export interface CreateTokenBody {
  name: string;
  role: TokenRole;
  spaces: string[];
}

/** Checks `--role`; defaults to `viewer`. */
export function parseTokenRole(value: string | undefined): TokenRole {
  if (value === undefined) {
    return 'viewer';
  }

  const role = value.trim().toLowerCase();

  if (role === 'owner') {
    throw new Error('Owner tokens cannot be created. Use --role developer for a token that manages the project.');
  }

  if (!(TOKEN_ROLES as readonly string[]).includes(role)) {
    throw new Error(`Unknown role "${value}". Use one of: ${TOKEN_ROLES.join(', ')}.`);
  }

  return role as TokenRole;
}

/** `--space a --space b,c` → `['a', 'b', 'c']`, without blanks or repeats. */
export function parseSpaceFlags(values: string[] | undefined): string[] {
  const spaces = (values ?? []).flatMap((value) => value.split(',')).map((value) => value.trim());

  return [...new Set(spaces.filter(Boolean))];
}

export function buildCreateTokenBody(input: {
  name: string | undefined;
  role?: string;
  spaces?: string[];
}): CreateTokenBody {
  const name = input.name?.trim() ?? '';

  if (!name) {
    throw new Error('Give the token a name, for example `flexkit tokens create "GitHub Actions"`.');
  }

  return { name, role: parseTokenRole(input.role), spaces: parseSpaceFlags(input.spaces) };
}

export function describeTokenSpaces(spaces: TokenSpace[]): string {
  return spaces.length > 0 ? spaces.map((space) => space.code).join(', ') : 'unrestricted only';
}

/** Table rows for `tokens ls`: ID, NAME, ROLE, SPACES, TOKEN, CREATED BY, CREATED. */
export function tokenRows(tokens: TokenDto[], now = Date.now()): string[][] {
  return tokens.map((token) => [
    String(token.id),
    token.name,
    token.role.toLowerCase(),
    describeTokenSpaces(token.spaces),
    token.last_digits ? `****${token.last_digits}` : '',
    token.created_by_name ?? '',
    formatRelativeTime(token.created_at, now),
  ]);
}

/** Finds a token by numeric id, else by exact (case-insensitive) name. */
export function findToken(tokens: TokenDto[], idOrName: string): TokenDto {
  const value = idOrName.trim();

  if (/^\d+$/.test(value)) {
    const byId = tokens.find((token) => String(token.id) === value);

    if (byId) {
      return byId;
    }
  }

  const wanted = value.toLowerCase();
  const matches = tokens.filter((token) => token.name.toLowerCase() === wanted);

  if (matches.length === 0) {
    throw new Error(`No token named "${idOrName}". Run \`flexkit tokens ls\` to see the project's tokens.`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Several tokens are named "${idOrName}": ${matches.map((token) => String(token.id)).join(', ')}. Pass the id instead.`
    );
  }

  return matches[0] as TokenDto;
}
