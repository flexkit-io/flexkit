'use client';

import { useAuth } from '../auth/auth-context';
import { canMutateData } from './permissions';

/**
 * What the signed-in member may do in the open project, as the backend
 * reports it next to the role. Like `canMutateData`, this only decides what
 * the Studio shows: the server checks every request again.
 */
export type Capabilities = {
  /**
   * Creating automations. Owners and developers always may; editors and
   * contributors may create their own personal automations when the project
   * allows it. Older backends do not send it: the role decides, as before.
   */
  canCreatePersonalAutomations: boolean;
  canDeleteRecords: boolean;
  canImportRecords: boolean;
  canManageKnowledge: boolean;
  canRunBulkChanges: boolean;
};

export type CapabilityName = keyof Capabilities;

const CAPABILITY_NAMES: readonly CapabilityName[] = [
  'canCreatePersonalAutomations',
  'canDeleteRecords',
  'canImportRecords',
  'canManageKnowledge',
  'canRunBulkChanges',
];

type CapabilitySubject = { capabilities?: unknown; role?: string | null } | null | undefined;

/**
 * Reads the capabilities the backend sent for the current user.
 *
 * An older or self-hosted backend sends no `capabilities` at all. The Studio
 * must then behave as it did before capabilities existed, when anyone but a
 * viewer was offered every action, so each missing answer falls back to
 * `canMutateData(role)`. The same fallback applies one capability at a time
 * to a value that is not a boolean: a backend that knows only some of them
 * still decides those, and a malformed answer never unlocks more than the
 * role alone did.
 */
export function resolveCapabilities(user: CapabilitySubject): Capabilities {
  const fallback = canMutateData(user?.role);
  const sent = user?.capabilities;
  const source =
    sent && typeof sent === 'object' && !Array.isArray(sent) ? (sent as Record<string, unknown>) : undefined;
  const resolved = {} as Capabilities;

  for (const name of CAPABILITY_NAMES) {
    const value = source?.[name];

    resolved[name] = typeof value === 'boolean' ? value : fallback;
  }

  return resolved;
}

export function useCapabilities(): Capabilities {
  const [, auth] = useAuth();

  return resolveCapabilities(auth.user);
}

/** Deleting records, assets and tags: editors and above. */
export function useCanDeleteRecords(): boolean {
  return useCapabilities().canDeleteRecords;
}

/** Adding, changing, removing and linking Knowledge documents: editors and above. */
export function useCanManageKnowledge(): boolean {
  return useCapabilities().canManageKnowledge;
}
