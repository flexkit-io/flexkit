'use client';

import { createContext, useContext, useMemo } from 'react';
import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { assetSchema } from '../../entities/assets-schema';
import { tagSchema } from '../../entities/tags-schema';
import { builtInApps } from '../apps/built-in-apps';
import type { AppOptions, ProjectSchemaError, ProjectSummary, ProjectUiConfig, StudioMode } from './types';
import type { Entity } from '../types';
import { useProjectSchema, useProjectSchemas } from './use-project-schemas';

export interface ConfigContext {
  /** `projects` when the host passed `projectIds`, `hosted` when the Studio listed the user's projects itself. */
  mode: StudioMode;
  /** The Studio apps shown in the app bar, in order. */
  apps: AppOptions[];
  /** Kept for callers that read `contributions.apps`; same list as `apps`. */
  contributions: {
    apps: AppOptions[];
  };
  currentProjectId?: string;
  /** The project named by the `:projectId` route param, once its schema has loaded. */
  currentProject?: ProjectUiConfig;
  currentProjectSchema: Entity[];
  /** Projects whose schema loaded, in `projectIds` order. */
  projects: ProjectUiConfig[];
  /** Every project id the Studio can open, loaded or not. */
  projectIds: string[];
  /** Hosted mode: name, avatar, role and team of each project, known before any schema loads. */
  projectSummaries: ProjectSummary[];
  /** Per project id: why its schema could not be loaded. */
  schemaErrors: { [projectId: string]: ProjectSchemaError };
  isLoadingSchemas: boolean;
}

const ConfigContext = createContext<ConfigContext>({
  mode: 'projects',
  apps: builtInApps,
  contributions: { apps: builtInApps },
  currentProjectId: undefined,
  currentProject: undefined,
  currentProjectSchema: [],
  projects: [],
  projectIds: [],
  projectSummaries: [],
  schemaErrors: {},
  isLoadingSchemas: false,
});

/** Appends the reserved asset and tag entities to a deployed schema. */
export function upsertReservedEntities(schema: Entity[]): Entity[] {
  const withoutReserved = schema.filter((entity) => entity.name !== assetSchema.name && entity.name !== tagSchema.name);

  return [...withoutReserved, assetSchema, tagSchema];
}

export function ConfigProvider({
  projectIds,
  projectSummaries = [],
  mode = 'projects',
  userId,
  children,
}: {
  projectIds: string[];
  projectSummaries?: ProjectSummary[];
  mode?: StudioMode;
  /** Hosted mode: the signed-in user's id, known before the per-project `/users/me` call. */
  userId?: string;
  children: React.ReactNode;
}): JSX.Element {
  /**
   * Getting the projectId from the URL via react-router-dom's useParams hook triggers a rerender of this Context
   * every time the URL changes.
   */
  const { projectId: currentProjectId } = useParams<{ projectId: string }>();
  const [, auth] = useAuth();
  const schemaUserId = auth.user?.id ?? userId;
  // Project mode loads every project up front (short, host-defined list); hosted mode only the one open.
  const allSchemas = useProjectSchemas(mode === 'projects' ? projectIds : [], schemaUserId);
  const currentSchema = useProjectSchema(
    mode === 'hosted' && currentProjectId && projectIds.includes(currentProjectId) ? currentProjectId : undefined,
    schemaUserId
  );
  const { projects: loadedProjects, errors, isLoading } = mode === 'hosted' ? currentSchema : allSchemas;
  const projects = useMemo(
    () =>
      projectIds
        .map((projectId) => loadedProjects.find((project) => project.projectId === projectId))
        .filter((project): project is ProjectUiConfig => project !== undefined)
        .map((project) => ({ ...project, schema: upsertReservedEntities(project.schema) })),
    [loadedProjects, projectIds]
  );

  const value = useMemo<ConfigContext>(() => {
    const currentProject = projects.find((project) => project.projectId === currentProjectId);

    return {
      mode,
      apps: builtInApps,
      contributions: { apps: builtInApps },
      currentProjectId,
      currentProject,
      currentProjectSchema: currentProject?.schema ?? [],
      projects,
      projectIds,
      projectSummaries,
      schemaErrors: errors,
      isLoadingSchemas: isLoading,
    };
  }, [currentProjectId, errors, isLoading, mode, projectIds, projectSummaries, projects]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContext {
  return useContext(ConfigContext);
}
