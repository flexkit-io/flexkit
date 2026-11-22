export type PluginScope = 'project' | 'personal';

export interface PluginConnection {
  id: string;
  pluginId: string;
  scope: PluginScope;
  /** Provider account name, e.g. the connected email or workspace. */
  accountName: string | null;
  /** User-chosen label; null falls back to the provider account name. */
  label: string | null;
  /** label ?? accountName ?? plugin name. */
  displayName: string;
  /** Exactly one connected account per scope is primary; agents use it by default. */
  isPrimary: boolean;
  externalAccountId: string;
  status: 'connected' | 'needs_auth';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A plugin that connects with a token the user pastes into a form, instead of a sign-in. */
export interface PluginApiTokenConnect {
  type: 'api-token';
  /** What the provider calls it, e.g. "Tinybird token". */
  tokenLabel: string;
  helpUrl: string | null;
  placeholder: string | null;
  /** Regular expression a valid token matches. */
  pattern: string | null;
}

/** One input of a credentials connect form. */
export interface PluginCredentialField {
  key: string;
  label: string;
  /** Secrets render as password inputs. */
  kind: 'text' | 'secret';
  placeholder: string | null;
  /** One sentence under the input: where the value comes from. */
  help: string | null;
  /** Regular expression a valid value matches. */
  pattern: string | null;
  /** Regular expression that recognizes this secret on its own, to stop one pasted into the chat. */
  detect: string | null;
  required: boolean;
}

/** One way to connect, when the provider offers several, each with its own fields. */
export interface PluginCredentialMethod {
  key: string;
  label: string;
  description: string | null;
  fields: PluginCredentialField[];
}

/**
 * A plugin that connects with credentials the user creates in the provider's
 * own admin and enters into a form: fields common to every method, then the
 * methods to choose from (none when there is only one way).
 */
export interface PluginCredentialsConnect {
  type: 'credentials';
  provider: string;
  /** What to create on the provider's side before connecting. */
  description: string;
  helpUrl: string | null;
  fields: PluginCredentialField[];
  methods: PluginCredentialMethod[];
}

/** A step to take on the provider's side before connecting, declared by the plugin. */
export interface PluginSetupNotice {
  title?: string;
  message: string;
  link?: { label: string; url: string };
}

export interface MarketplacePlugin {
  usedBy: Array<{ id: string; name: string }>;
  id: string;
  name: string;
  description: string;
  category: string;
  scopes: PluginScope[];
  version: string | null;
  versionId: string;
  updatedAt: string;
  preview: boolean;
  /** Absent from older platforms. */
  setupNotice?: PluginSetupNotice | null;
  capabilities: { agentTools: boolean; automationDelivery: boolean };
  /** Absent from older platforms, which only have sign-in plugins. */
  connect?: { type: 'oauth' } | PluginApiTokenConnect | PluginCredentialsConnect;
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
  skills: Array<{ key: string; name: string; description: string; content: string }>;
  servers: string[];
  changelog: string;
  diagnostics: string[];
}

export interface PluginTools {
  servers: Array<{
    name: string;
    tools: Array<{ name: string; description?: string; inputSchema: { [key: string]: unknown } }>;
    error?: string;
    expiresAt?: string;
  }>;
}

/** A Slack workspace of one of the project's Slack connections, and whether the agent answers there. */
export interface SlackAgentConnection {
  /**
   * The workspace answers for another project; turning it on here moves it, and that project's
   * channel spaces go. Absent from older platforms.
   */
  answersElsewhere?: boolean;
  connectionId: string;
  enabled: boolean;
  teamId: string;
  teamName: string | null;
}

/** A Slack channel bound to spaces: the agent answering there sees only those spaces. */
export interface SlackAgentChannelBinding {
  channelId: string;
  spaceIds: string[];
  teamId: string;
}

/** The project's Slack agent settings, as `GET /slack-agent` returns them. */
export interface SlackAgentSettings {
  channels: SlackAgentChannelBinding[];
  connections: SlackAgentConnection[];
}

/** A channel of a Slack workspace the app can list. */
export interface SlackAgentChannel {
  id: string;
  name: string;
}
