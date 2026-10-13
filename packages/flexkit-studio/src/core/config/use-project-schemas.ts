'use client';

import useSWR from 'swr';
import { apiPaths } from '../api-paths';
import type { ProjectSchemaError, ProjectUiConfig } from './types';

export type ProjectSchemasState = {
  projects: ProjectUiConfig[];
  errors: { [projectId: string]: ProjectSchemaError };
  isLoading: boolean;
};

type FetchOutcome = { ok: true; project: ProjectUiConfig } | { ok: false; projectId: string; error: ProjectSchemaError };

async function fetchProjectSchema(projectId: string): Promise<FetchOutcome> {
  try {
    const response = await fetch(apiPaths(projectId).schema, { credentials: 'include', mode: 'cors' });

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
 * Loads the deployed schema of every project the Studio can open. Fetching
 * starts once the user is known (the endpoint needs a session) and the result
 * is kept for the lifetime of the page: schemas only change on deploy.
 */
export function useProjectSchemas(projectIds: string[], userId: string | undefined): ProjectSchemasState {
  const key = userId && projectIds.length > 0 ? ['project-schemas', userId, ...projectIds] : null;
  const { data, isLoading } = useSWR(key, () => Promise.all(projectIds.map((projectId) => fetchProjectSchema(projectId))), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  return toProjectSchemasState(data, Boolean(key) && (isLoading || data === undefined));
}
