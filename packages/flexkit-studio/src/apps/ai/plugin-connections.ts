import type { PluginConnection } from './plugin-types';

/**
 * Whether the agent can use a connection now: signed in, and pointed at its
 * project for plugins whose connections each work in one (Supabase).
 */
export function isUsableConnection(connection: PluginConnection): boolean {
  return connection.status === 'connected' && connection.needsTarget !== true;
}
