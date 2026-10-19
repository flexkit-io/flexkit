import type { MarketplacePlugin, PluginConnection, PluginScope } from '../plugin-types';

/** What the chat's connect card offers, from the plugin's current connections and the viewer's rights. */
export type PluginConnectState =
  | { kind: 'connected'; connection: PluginConnection }
  | { kind: 'reconnect'; connection: PluginConnection }
  | { kind: 'connect'; scopes: PluginScope[] }
  | { kind: 'disabled' }
  | { kind: 'not_permitted' };

/**
 * The card's message for a sign-in that did not finish. A closed or abandoned
 * window says only that; anything else names the reason, so a failure the
 * user did not cause can be reported.
 */
export function describeConnectFailure(pluginName: string, detail: string): string {
  const reason = detail.trim();

  if (!reason || /window was closed|not completed/i.test(reason)) {
    return `${pluginName} authorization didn't finish`;
  }

  if (/popups|different account/i.test(reason)) {
    return reason;
  }

  return `${pluginName} authorization didn't finish: ${reason.replace(/\.$/, '')}`;
}

/** The account chat uses: the personal primary wins over the project primary. */
function chatConnection(plugin: MarketplacePlugin): PluginConnection | null {
  const primaries = plugin.connections.filter(
    (connection) => connection.isPrimary && connection.status === 'connected'
  );

  return (
    primaries.find((connection) => connection.scope === 'personal') ??
    primaries.find((connection) => connection.scope === 'project') ??
    null
  );
}

/** Same rule as the Marketplace: personal needs the project to allow it, project needs an owner or developer. */
function scopePermitted(plugin: MarketplacePlugin, canManage: boolean, scope: PluginScope): boolean {
  return scope === 'personal' ? plugin.allowPersonal : canManage;
}

/**
 * `connectionId` is the account the agent asked to reconnect, if any. A card
 * stays truthful after the fact: once the account works again (here or in the
 * Marketplace) it shows as connected.
 */
export function getPluginConnectState(
  plugin: MarketplacePlugin,
  canManage: boolean,
  connectionId?: string
): PluginConnectState {
  if (!plugin.enabled) {
    return { kind: 'disabled' };
  }

  const broken = connectionId
    ? plugin.connections.find((connection) => connection.id === connectionId && connection.status === 'needs_auth')
    : undefined;

  if (broken) {
    return scopePermitted(plugin, canManage, broken.scope)
      ? { kind: 'reconnect', connection: broken }
      : { kind: 'not_permitted' };
  }

  const connected = chatConnection(plugin);

  if (connected) {
    return { kind: 'connected', connection: connected };
  }

  const scopes = plugin.scopes.filter((scope) => scopePermitted(plugin, canManage, scope));

  return scopes.length > 0 ? { kind: 'connect', scopes } : { kind: 'not_permitted' };
}
