'use client';

import { createContext, useContext, useMemo } from 'react';
import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { assetSchema } from '../../entities/assets-schema';
import { tagSchema } from '../../entities/tags-schema';
import { builtInApps } from '../apps/built-in-apps';
import type { AppOptions, ProjectSchemaError, ProjectUiConfig } from './types';
import type { Entity } from '../types';
import { useProjectSchemas } from './use-project-schemas';

export interface ConfigContext {
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
  /** Every project id the host passed, loaded or not. */
  projectIds: string[];
  /** Per project id: why its schema could not be loaded. */
  schemaErrors: { [projectId: string]: ProjectSchemaError };
  isLoadingSchemas: boolean;
}

const ConfigContext = createContext<ConfigContext>({
  apps: builtInApps,
  contributions: { apps: builtInApps },
  currentProjectId: undefined,
  currentProject: undefined,
  currentProjectSchema: [],
  projects: [],
  projectIds: [],
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
  children,
}: {
  projectIds: string[];
  children: React.ReactNode;
}): JSX.Element {
  /**
   * Getting the projectId from the URL via react-router-dom's useParams hook triggers a rerender of this Context
   * every time the URL changes.
   */
  const { projectId: currentProjectId } = useParams<{ projectId: string }>();
  const [, auth] = useAuth();
  const { projects: loadedProjects, errors, isLoading } = useProjectSchemas(projectIds, auth.user?.id);
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
      apps: builtInApps,
      contributions: { apps: builtInApps },
      currentProjectId,
      currentProject,
      currentProjectSchema: currentProject?.schema ?? [],
      projects,
      projectIds,
      schemaErrors: errors,
      isLoadingSchemas: isLoading,
    };
  }, [currentProjectId, errors, isLoading, projectIds, projects]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContext {
  return useContext(ConfigContext);
}
