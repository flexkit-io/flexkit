/**
 * Pure helpers for `flexkit plugins`: response types of the plugin routes,
 * connection picking, credential form handling and Studio links.
 */

export type PluginScope = 'project' | 'personal';

export interface PluginConnection {
  id: string;
  pluginId: string;
  scope: PluginScope;
  accountName: string | null;
  label: string | null;
  displayName: string;
  isPrimary: boolean;
  externalAccountId: string;
  status: 'connected' | 'needs_auth' | string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialField {
  key: string;
  label: string;
  kind: 'text' | 'secret';
  placeholder: string | null;
  help: string | null;
  pattern: string | null;
  detect?: string | null;
  required: boolean;
}

export interface CredentialMethod {
  key: string;
  label: string;
  description: string | null;
  fields: CredentialField[];
}

export type PluginConnect =
  | { type: 'oauth' }
  | {
      type: 'api-token';
      tokenLabel: string;
      helpUrl: string | null;
      placeholder: string | null;
      pattern: string | null;
    }
  | {
      type: 'credentials';
      provider: string;
      description: string;
      helpUrl: string | null;
      fields: CredentialField[];
      methods: CredentialMethod[];
    };

export interface MarketplacePlugin {
  usedBy: { id: string; name: string }[];
  id: string;
  name: string;
  description: string;
  category: string;
  scopes: PluginScope[];
  version: string | null;
  versionId: string;
  updatedAt: string;
  preview: boolean;
  capabilities: { agentTools: boolean; automationDelivery: boolean };
  connect?: PluginConnect;
  sourceUrl: string;
  logoUrl: string;
  enabled: boolean;
  allowPersonal: boolean;
  installed: boolean;
  updateMode: 'auto' | 'pinned';
  connections: PluginConnection[];
}

export interface Marketplace {
  plugins: MarketplacePlugin[];
  canManage: boolean;
  catalogSha: string | null;
}

export interface PluginDetail {
  plugin: MarketplacePlugin;
  canManage: boolean;
  skills: { key: string; name: string; description: string }[];
  servers: string[];
  changelog: string;
  diagnostics: string[];
}

export interface PluginTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean };
}

export interface PluginToolsResponse {
  servers: { name: string; tools: PluginTool[]; error?: string; errorCode?: string; expiresAt?: string }[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** A plugin counts as in use when it is installed or has a connected account. */
export function isInUse(plugin: MarketplacePlugin): boolean {
  return plugin.installed || plugin.connections.length > 0;
}

export type ListFilter = 'in-use' | 'available' | 'all';

export function filterPlugins(plugins: MarketplacePlugin[], filter: ListFilter): MarketplacePlugin[] {
  const selected =
    filter === 'all'
      ? plugins
      : plugins.filter((plugin) => (filter === 'available' ? !isInUse(plugin) : isInUse(plugin)));

  return [...selected].sort((left, right) => left.name.localeCompare(right.name));
}

/** One word for the plugin's state in this project. */
export function pluginState(plugin: MarketplacePlugin): string {
  if (!plugin.enabled) {
    return 'disabled';
  }

  if (plugin.connections.some((connection) => connection.status === 'connected')) {
    return 'connected';
  }

  if (plugin.connections.length > 0) {
    return 'needs_auth';
  }

  return plugin.installed ? 'installed' : 'available';
}

export function connectTypeLabel(connect: PluginConnect | undefined): string {
  switch (connect?.type) {
    case 'api-token':
      return 'token';
    case 'credentials':
      return 'credentials';
    default:
      return 'sign-in';
  }
}

/**
 * The connection the agent would use: the primary personal account, then the
 * primary project account, then any connected one. `explicit` (an id) wins.
 */
export function pickConnection(
  connections: PluginConnection[],
  explicit?: string
): { connection: PluginConnection } | { error: string } {
  if (explicit) {
    const match = connections.find((connection) => connection.id === explicit);

    return match ? { connection: match } : { error: `Connection ${explicit} is not an account of this plugin.` };
  }

  const connected = connections.filter((connection) => connection.status === 'connected');
  const choice =
    connected.find((connection) => connection.scope === 'personal' && connection.isPrimary) ??
    connected.find((connection) => connection.scope === 'project' && connection.isPrimary) ??
    connected[0];

  if (choice) {
    return { connection: choice };
  }

  return {
    error:
      connections.length > 0
        ? 'Every account of this plugin needs to be reconnected.'
        : 'This plugin has no connected account.',
  };
}

/** Default connection scope: the project when the user may manage it, else personal. */
export function defaultScope(plugin: MarketplacePlugin, canManage: boolean): PluginScope | null {
  if (plugin.scopes.includes('project') && canManage) {
    return 'project';
  }

  if (plugin.scopes.includes('personal') && plugin.allowPersonal) {
    return 'personal';
  }

  return null;
}

/** The fields a credentials connection needs: the shared ones plus the chosen method's. */
export function credentialFieldsFor(
  connect: Extract<PluginConnect, { type: 'credentials' }>,
  method: string | undefined
): CredentialField[] | null {
  if (connect.methods.length === 0) {
    return method === undefined ? connect.fields : null;
  }

  const selected = connect.methods.find((item) => item.key === method);

  return selected ? [...connect.fields, ...selected.fields] : null;
}

/** Parses repeated `--set key=value` flags as plain strings (credentials are never JSON-decoded). */
export function parseStringPairs(pairs: string[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};

  for (const pair of pairs ?? []) {
    const index = pair.indexOf('=');

    if (index <= 0) {
      throw new Error(`Expected key=value, got "${pair}".`);
    }

    result[pair.slice(0, index)] = pair.slice(index + 1);
  }

  return result;
}

/** Returns an error message when `value` does not fit the field, else null. */
export function validateCredential(field: CredentialField, value: string | undefined): string | null {
  if (value === undefined || value === '') {
    return field.required ? `${field.label} is required.` : null;
  }

  if (field.pattern) {
    try {
      if (!new RegExp(field.pattern, 'u').test(value)) {
        return `${field.label} does not look right.`;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/** Keys passed with `--set` that the chosen form does not know. */
export function unknownCredentialKeys(fields: CredentialField[], values: Record<string, string>): string[] {
  const known = new Set(fields.map((field) => field.key));

  return Object.keys(values).filter((key) => !known.has(key));
}

/**
 * A connection that appeared, or was reconnected (its status or `updatedAt`
 * changed), since `before` was read. Compares server timestamps only, so a
 * skewed local clock cannot cause a false match.
 */
export function findNewConnection(before: PluginConnection[], after: PluginConnection[]): PluginConnection | null {
  const known = new Map(before.map((connection) => [connection.id, connection]));

  for (const connection of after) {
    if (connection.status !== 'connected') {
      continue;
    }

    const previous = known.get(connection.id);

    if (!previous || previous.status !== 'connected' || previous.updatedAt !== connection.updatedAt) {
      return connection;
    }
  }

  return null;
}

/** Hosted Studio origin: FLEXKIT_STUDIO_URL, else flexkit.app. */
export function studioOrigin(env: Record<string, string | undefined> = process.env): string {
  return (env.FLEXKIT_STUDIO_URL?.trim() || 'https://flexkit.app').replace(/\/+$/, '');
}

export function studioPluginUrl(origin: string, projectId: string, pluginId: string): string {
  return `${origin}/${encodeURIComponent(projectId)}/ai/plugins/${encodeURIComponent(pluginId)}`;
}

/** Tool access from its MCP annotations. */
export function toolAccess(tool: PluginTool): string {
  if (tool.annotations?.readOnlyHint) {
    return 'read';
  }

  return tool.annotations?.destructiveHint ? 'destructive' : 'write';
}
