import os from 'node:os';
import path from 'node:path';

/**
 * Pure helpers for `flexkit mcp`: the hosted MCP server URL and merging a
 * server entry into an MCP client's JSON configuration without losing what is
 * already there.
 */

export type McpReach = 'project' | 'team' | 'account';

export const MCP_CLIENTS = ['claude-code', 'claude-desktop', 'cursor', 'vscode', 'windsurf'] as const;
export type McpClient = (typeof MCP_CLIENTS)[number];
export type ConfigScope = 'user' | 'project' | 'local';

export function isMcpClient(value: string): value is McpClient {
  return (MCP_CLIENTS as readonly string[]).includes(value);
}

/**
 * The MCP host next to the API host: `https://api.flexkit.io` → `https://mcp.flexkit.io`.
 * `FLEXKIT_MCP_URL` overrides it.
 */
export function mcpOrigin(apiUrl: string, env: Record<string, string | undefined> = process.env): string {
  const override = env.FLEXKIT_MCP_URL?.trim();

  if (override) {
    return override.replace(/\/+$/, '');
  }

  const url = new URL(apiUrl);
  const host = url.host.startsWith('api.') ? url.host.slice(4) : url.host;

  return `https://mcp.${host}`;
}

export function buildMcpUrl({
  origin,
  teamId,
  projectId,
  readOnly = false,
}: {
  origin: string;
  teamId?: string;
  projectId?: string;
  readOnly?: boolean;
}): string {
  let pathname = '';

  if (teamId) {
    pathname = projectId
      ? `/${encodeURIComponent(teamId)}/${encodeURIComponent(projectId)}`
      : `/${encodeURIComponent(teamId)}`;
  }

  return `${origin}${pathname}${readOnly ? '?read_only=true' : ''}`;
}

export interface ClientTarget {
  /** Config file to merge into; null for clients configured another way. */
  file: string | null;
  /** Top-level key that holds the servers. */
  key: 'mcpServers' | 'servers';
  entry: Record<string, unknown>;
}

/** Scopes each client supports; the first is the default. */
export const CLIENT_SCOPES: Record<McpClient, ConfigScope[]> = {
  'claude-code': ['local', 'project', 'user'],
  'claude-desktop': ['user'],
  cursor: ['project', 'user'],
  vscode: ['project', 'user'],
  windsurf: ['user'],
};

function vscodeUserDir(platform: NodeJS.Platform, home: string, env: Record<string, string | undefined>): string {
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Code', 'User');
  }

  if (platform === 'win32') {
    return path.join(env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'Code', 'User');
  }

  return path.join(env.XDG_CONFIG_HOME ?? path.join(home, '.config'), 'Code', 'User');
}

/** Where a client keeps its MCP servers and the entry shape it expects for a remote server. */
export function clientTarget(
  client: Exclude<McpClient, 'claude-code' | 'claude-desktop'>,
  scope: ConfigScope,
  url: string,
  {
    cwd,
    home = os.homedir(),
    platform = process.platform,
    env = process.env,
  }: { cwd: string; home?: string; platform?: NodeJS.Platform; env?: Record<string, string | undefined> }
): ClientTarget {
  switch (client) {
    case 'cursor':
      return {
        file: scope === 'user' ? path.join(home, '.cursor', 'mcp.json') : path.join(cwd, '.cursor', 'mcp.json'),
        key: 'mcpServers',
        entry: { url },
      };
    case 'vscode':
      return {
        file:
          scope === 'user'
            ? path.join(vscodeUserDir(platform, home, env), 'mcp.json')
            : path.join(cwd, '.vscode', 'mcp.json'),
        key: 'servers',
        entry: { type: 'http', url },
      };
    case 'windsurf':
      return {
        file: path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
        key: 'mcpServers',
        entry: { serverUrl: url },
      };
  }
}

export type MergeResult =
  | { status: 'added' | 'replaced' | 'unchanged'; text: string; previous?: unknown }
  | { status: 'conflict'; previous: unknown };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function detectIndent(text: string): string | number {
  const match = /^[ \t]+(?=")/m.exec(text);

  return match ? match[0] : 2;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Adds `name` under `key` in a client config, keeping every other setting and
 * server. An existing entry with a different value is a conflict unless
 * `replace` is set. Throws when the file is not plain JSON (for example JSON
 * with comments), so a file is never rewritten in a way that loses content.
 */
export function mergeMcpConfig(
  existing: string | null,
  key: string,
  name: string,
  entry: Record<string, unknown>,
  { replace = false }: { replace?: boolean } = {}
): MergeResult {
  let config: Record<string, unknown> = {};
  const text = existing?.trim() ?? '';

  if (text) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('The file is not plain JSON (it may contain comments), so it was left untouched.');
    }

    if (!isPlainObject(parsed)) {
      throw new Error('The file does not contain a JSON object, so it was left untouched.');
    }

    config = parsed;
  }

  const servers = config[key] ?? {};

  if (!isPlainObject(servers)) {
    throw new Error(`"${key}" in the file is not an object, so it was left untouched.`);
  }

  const previous = servers[name];

  if (previous !== undefined && sameJson(previous, entry)) {
    return { status: 'unchanged', text: existing ?? '', previous };
  }

  if (previous !== undefined && !replace) {
    return { status: 'conflict', previous };
  }

  const next = { ...config, [key]: { ...servers, [name]: entry } };
  const output = `${JSON.stringify(next, null, text ? detectIndent(existing ?? '') : 2)}\n`;

  return previous === undefined ? { status: 'added', text: output } : { status: 'replaced', text: output, previous };
}

/** Arguments for `claude mcp add`. */
export function claudeCodeArgs(name: string, url: string, scope: ConfigScope): string[] {
  return ['mcp', 'add', '--transport', 'http', '--scope', scope, name, url];
}

/** Quotes a shell argument for display. */
export function shellQuote(value: string): string {
  return /^[A-Za-z0-9_./:=@-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}
