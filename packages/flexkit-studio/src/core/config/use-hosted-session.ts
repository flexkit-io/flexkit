'use client';

import useSWR, { mutate } from 'swr';
import { userApiPaths } from '../api-paths';
import type { CreatedProject } from './create-project';
import type { HostedTeam, HostedUser, ProjectSummary } from './types';

export type HostedSession =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'error'; message: string }
  | { status: 'ready'; user: HostedUser; projects: ProjectSummary[]; teams: HostedTeam[] };

/** `teams` is missing from backends older than Studio onboarding. */
type MeResponse = { projects: ProjectSummary[]; teams?: HostedTeam[]; user: HostedUser };

const SESSION_KEY = 'hosted-session';
export type MeOutcome =
  | { kind: 'anonymous' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: MeResponse };

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

  return {
    status: 'ready',
    projects: outcome.data.projects,
    teams: outcome.data.teams ?? [],
    user: outcome.data.user,
  };
}

/**
 * Hosted mode: who is signed in and which projects they can open. Fetched once
 * per page load; `rememberCreatedProject` adds a project the user just created.
 */
export function useHostedSession(): HostedSession {
  const { data } = useSWR(SESSION_KEY, fetchMe, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  return toHostedSession(data);
}

/** The session with a just-created project (and its team, if new) added; the user owns both. */
export function withCreatedProject(outcome: MeOutcome | undefined, created: CreatedProject): MeOutcome | undefined {
  if (outcome?.kind !== 'ready' || outcome.data.projects.some((project) => project.id === created.project.id)) {
    return outcome;
  }

  const teams = outcome.data.teams ?? [];
  const project: ProjectSummary = {
    avatarUrl: null,
    id: created.project.id,
    name: created.project.name,
    readOnly: false,
    role: 'owner',
    suspended: false,
    team: created.team,
  };

  return {
    kind: 'ready',
    data: {
      ...outcome.data,
      projects: [...outcome.data.projects, project],
      teams: teams.some((team) => team.id === created.team.id) ? teams : [...teams, { ...created.team, role: 'owner' }],
    },
  };
}

/**
 * Adds a project the user just created to the session, so the Studio can open
 * it at once. No `/api/me` round trip: the create response says everything the
 * session needs, and a failed re-read must not hide a project that exists.
 */
export async function rememberCreatedProject(created: CreatedProject): Promise<void> {
  await mutate<MeOutcome>(SESSION_KEY, (current) => withCreatedProject(current, created), { revalidate: false });
}

/** The session with the signed-in user's new display name. */
export function withDisplayName(outcome: MeOutcome | undefined, displayName: string): MeOutcome | undefined {
  if (outcome?.kind !== 'ready') {
    return outcome;
  }

  return { kind: 'ready', data: { ...outcome.data, user: { ...outcome.data.user, displayName } } };
}

/** Shows a display name the user just saved, without re-reading `/api/me`. */
export async function rememberDisplayName(displayName: string): Promise<void> {
  await mutate<MeOutcome>(SESSION_KEY, (current) => withDisplayName(current, displayName), { revalidate: false });
}
