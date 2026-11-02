'use client';

import useSWR, { mutate } from 'swr';
import { apiPaths } from '../api-paths';
import type { ProjectSchemaError, ProjectUiConfig } from './types';

export type ProjectSchemasState = {
  projects: ProjectUiConfig[];
  errors: { [projectId: string]: ProjectSchemaError };
  isLoading: boolean;
};

export type FetchOutcome =
  | { ok: true; project: ProjectUiConfig }
  | { ok: false; projectId: string; error: ProjectSchemaError };

async function fetchProjectSchema(projectId: string): Promise<FetchOutcome> {
  try {
    const response = await fetch(apiPaths(projectId).schema, {
      credentials: 'include',
      mode: 'cors',
      // Revalidate with the server on every fetch (304 when unchanged), so a
      // refetch after a deploy never reads a stale HTTP-cached schema.
      cache: 'no-cache',
    });

    if (!response.ok) {
      let message = response.statusText || `Request failed with status ${String(response.status)}`;

      try {
        const body = (await response.json()) as { error?: string; message?: string };
        message = body.error ?? body.message ?? message;
      } catch {
        // keep the status text
      }

      return { ok: false, projectId, error: { status: response.status, message } };
    }

    const project = (await response.json()) as ProjectUiConfig;

    return { ok: true, project: { ...project, projectId: project.projectId || projectId } };
  } catch (error) {
    return {
      ok: false,
      projectId,
      error: { status: 0, message: error instanceof Error ? error.message : 'Network error' },
    };
  }
}

export function toProjectSchemasState(outcomes: FetchOutcome[] | undefined, isLoading: boolean): ProjectSchemasState {
  const projects: ProjectUiConfig[] = [];
  const errors: { [projectId: string]: ProjectSchemaError } = {};

  for (const outcome of outcomes ?? []) {
    if (outcome.ok) {
      projects.push(outcome.project);
    } else {
      errors[outcome.projectId] = outcome.error;
    }
  }

  return { projects, errors, isLoading };
}

/**
 * Schemas change on deploy, which can happen outside this tab (the agent, the
 * CLI). Refetch when the user comes back to the tab, at most every 15s;
 * SWR compares the result, so an unchanged schema does not re-render.
 */
const SCHEMA_SWR_OPTIONS = {
  revalidateOnFocus: true,
  focusThrottleInterval: 15_000,
  revalidateOnReconnect: false,
} as const;

/**
 * A refetch (tab focus, reload button, watched deploy) must never replace a
 * schema that already loaded with an error: that would swap the whole app for
 * an error screen and drop an open edit drawer. Offline, an expired session or
 * revoked access still surface through the GraphQL requests themselves.
 */
export function keepLoadedSchema(previous: FetchOutcome | undefined, next: FetchOutcome): FetchOutcome {
  return !next.ok && previous?.ok ? previous : next;
}

/**
 * Loads the deployed schema of every project the Studio can open. Fetching
 * starts once the user is known (the endpoint needs a session). The result is
 * refetched on tab focus, on the list's reload button and after a deploy the
 * Studio watched.
 */
export function useProjectSchemas(projectIds: string[], userId: string | undefined): ProjectSchemasState {
  const key = userId && projectIds.length > 0 ? ['project-schemas', userId, ...projectIds] : null;
  const { data, isLoading } = useSWR(
    key,
    async (): Promise<FetchOutcome[]> => {
      const outcomes = await Promise.all(projectIds.map((projectId) => fetchProjectSchema(projectId)));

      // The key fixes the order of projectIds, so outcomes line up with the previous data.
      return outcomes.map((outcome, index) => keepLoadedSchema(data?.[index], outcome));
    },
    SCHEMA_SWR_OPTIONS
  );

  return toProjectSchemasState(data, Boolean(key) && (isLoading || data === undefined));
}

/** State of a single project's schema, in the same shape as the multi-project hook. */
export function toProjectSchemaState(outcome: FetchOutcome | undefined, isLoading: boolean): ProjectSchemasState {
  return toProjectSchemasState(outcome ? [outcome] : undefined, isLoading);
}

/**
 * Hosted mode: loads only the project currently open. Each project has its own
 * SWR key, so switching back to a project reuses the schema already fetched.
 */
export function useProjectSchema(projectId: string | undefined, userId: string | undefined): ProjectSchemasState {
  const key = userId && projectId ? ['project-schema', userId, projectId] : null;
  const { data, isLoading } = useSWR(
    key,
    async (): Promise<FetchOutcome> => keepLoadedSchema(data, await fetchProjectSchema(projectId ?? '')),
    SCHEMA_SWR_OPTIONS
  );

  return toProjectSchemaState(data, Boolean(key) && (isLoading || data === undefined));
}

/** True for the SWR keys that hold `projectId`'s schema (single- and multi-project hooks). */
export function isProjectSchemaKey(key: unknown, projectId: string): boolean {
  return (
    Array.isArray(key) &&
    (key[0] === 'project-schema' || key[0] === 'project-schemas') &&
    key.slice(2).includes(projectId)
  );
}

/** Refetches the deployed schema of `projectId`, e.g. after the agent deployed a schema change. */
export function revalidateProjectSchema(projectId: string): Promise<unknown> {
  return mutate((key) => isProjectSchemaKey(key, projectId));
}
