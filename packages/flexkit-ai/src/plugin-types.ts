export type PluginScope = 'project' | 'personal';

export interface PluginConnection {
  id: string;
  pluginId: string;
  scope: PluginScope;
  accountName: string | null;
  status: 'connected' | 'needs_auth' | 'revoked';
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
  capabilities: { agentTools: boolean; automationDelivery: boolean };
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
