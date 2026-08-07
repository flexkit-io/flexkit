'use client';

import { useAuth } from '../auth/auth-context';

/**
 * Viewers are read-only: the GraphQL route and the automations API reject
 * their mutations server-side. This helper only mirrors that rule in the UI
 * so restricted actions render as disabled instead of failing on submit.
 * While the role is still unknown (auth loading) actions stay enabled and
 * the server remains the source of truth.
 */
export function canMutateData(role: string | null | undefined): boolean {
  if (!role) {
    return true;
  }

  return role !== 'viewer';
}

export function useCanMutate(): boolean {
  const [, auth] = useAuth();

  return canMutateData(auth.user?.role);
}
