'use client';

import useSWR from 'swr';
import { userApiPaths } from '../api-paths';
import type { HostedUser, ProjectSummary } from './types';

export type HostedSession =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error'; message: string }
  | { status: 'ready'; user: HostedUser; projects: ProjectSummary[] };

type MeResponse = { projects: ProjectSummary[]; user: HostedUser };
type MeOutcome = { kind: 'anonymous' } | { kind: 'error'; message: string } | { kind: 'ready'; data: MeResponse };

async function fetchMe(): Promise<MeOutcome> {
  try {
    const response = await fetch(userApiPaths.me, { credentials: 'same-origin' });

    if (response.status === 401) {
      return { kind: 'anonymous' };
    }

    if (!response.ok) {
      return { kind: 'error', message: `Flexkit answered ${String(response.status)} while loading your projects.` };
    }

    return { kind: 'ready', data: (await response.json()) as MeResponse };
  } catch (error) {
    return { kind: 'error', message: error instanceof Error ? error.message : 'Flexkit is not reachable.' };
  }
}

export function toHostedSession(outcome: MeOutcome | undefined): HostedSession {
  if (!outcome) {
    return { status: 'loading' };
  }

  if (outcome.kind === 'anonymous') {
    return { status: 'anonymous' };
  }

  if (outcome.kind === 'error') {
    return { status: 'error', message: outcome.message };
  }

  return { status: 'ready', projects: outcome.data.projects, user: outcome.data.user };
}

/** Hosted mode: who is signed in and which projects they can open. Fetched once per page load. */
export function useHostedSession(): HostedSession {
  const { data } = useSWR('hosted-session', fetchMe, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  return toHostedSession(data);
}
