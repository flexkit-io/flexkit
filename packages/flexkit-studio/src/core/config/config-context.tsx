'use client';

import { createContext, useContext, useMemo } from 'react';
import type { JSX } from 'react';
import { has, path } from 'ramda';
import { useParams } from 'react-router-dom';
import { assetSchema } from '../../entities/assets-schema';
import { tagSchema } from '../../entities/tags-schema';
import type { AppOptions, StudioExtension, StudioContributions, ProjectOptions } from './types';
import type { Entity } from '../types';

export interface ConfigContext {
  contributions: {
    apps: AppOptions[] | [];
  };
  currentProjectId?: string;
  currentProjectSchema: Entity[];
  getContributionPointConfig: <T extends keyof StudioContributions>(
    contributionPoint: T,
    subPath?: string[]
  ) => StudioContributions[T][] | [];
  extensions: StudioExtension[];
  projects: ProjectOptions[];
}

const ConfigContext = createContext<ConfigContext>({
  contributions: {
    apps: [],
  },
  currentProjectId: undefined,
  currentProjectSchema: [],
  getContributionPointConfig: () => [],
  extensions: [] as StudioExtension[],
  projects: [] as ProjectOptions[],
});
const hasProjectIdProperty = (configItem: ProjectOptions | StudioExtension): boolean =>
  Object.prototype.hasOwnProperty.call(configItem, 'projectId');
const hasContributesProperty = (configItem: ProjectOptions | StudioExtension): boolean =>
  Object.prototype.hasOwnProperty.call(configItem, 'contributes');

export function ConfigProvider({
  config,
  children,
}: {
  config: ProjectOptions[];
  children: React.ReactNode;
}): JSX.Element {
  /**
   * Getting the projectId from the URL via react-router-dom's useParams hook triggers a rerender of this Context
   * every time the URL changes.
   */
  const { projectId: currentProjectId } = useParams<{ projectId: string }>();
  const enhancedConfig = useMemo(() => {
    const upsertReservedEntities = (schema: Entity[]): Entity[] => {
      const withoutReserved = schema.filter(
        (entity) => entity.name !== assetSchema.name && entity.name !== tagSchema.name
      );

      return [...withoutReserved, assetSchema, tagSchema];
    };

    return config.map((project) => ({
      ...project,
      schema: upsertReservedEntities(project.schema),
    }));
  }, [config]);

  const globalFlattenedConfig = useMemo(
    () => flattenConfigByProperty(['extensions'], enhancedConfig),
    [enhancedConfig]
  );
  const currentProjectFlattenedConfig = useMemo(
    () =>
      flattenConfigByProperty(
        ['extensions'],
        enhancedConfig.filter((item) => item.projectId === currentProjectId)
      ),
    [enhancedConfig, currentProjectId]
  );
  const allExtensions = useMemo(
    () =>
      globalFlattenedConfig.filter(
        (item: ProjectOptions | StudioExtension) => !hasProjectIdProperty(item) && hasContributesProperty(item)
      ) as StudioExtension[],
    [globalFlattenedConfig]
  );
  const currentProjectExtensions = useMemo(
    () =>
      currentProjectFlattenedConfig.filter(
        (item: ProjectOptions | StudioExtension) => !hasProjectIdProperty(item) && hasContributesProperty(item)
      ) as StudioExtension[],
    [currentProjectFlattenedConfig]
  );

  const globalConfig = useMemo(
    () => ({
      contributions: {
        apps: _getContributionPointConfig('apps', [], currentProjectExtensions) as AppOptions[] | [],
      },
      currentProjectId,
      currentProjectSchema: enhancedConfig.find((item) => item.projectId === currentProjectId)?.schema ?? [],
      getContributionPointConfig: <T extends keyof StudioContributions>(
        contributionPoint: T,
        subPath: string[] = []
      ): StudioContributions[T][] =>
        _getContributionPointConfig(contributionPoint, subPath, currentProjectExtensions) as StudioContributions[T][],
      extensions: allExtensions,
      projects: globalFlattenedConfig.filter((item: ProjectOptions | StudioExtension) =>
        hasProjectIdProperty(item)
      ) as ProjectOptions[],
    }),
    [allExtensions, currentProjectId, currentProjectExtensions, enhancedConfig, globalFlattenedConfig]
  );

  return <ConfigContext.Provider value={globalConfig}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContext {
  return useContext(ConfigContext);
}

function flattenConfigByProperty(
  property: string[],
  config: (ProjectOptions | StudioExtension)[]
): (ProjectOptions | StudioExtension)[] | [] {
  if (!Array.isArray(config)) {
    return [config];
  }

  return config.reduce<(ProjectOptions | StudioExtension)[]>((acc, curr) => {
    if (path(property, curr)) {
      return [...acc, curr, ...flattenConfigByProperty(property, path(property, curr) ?? [])];
    }

    return [...acc, curr];
  }, []);
}

function _getContributionPointConfig<T extends keyof StudioContributions>(
  contributionPoint: T,
  subPath: string[] = [],
  config: StudioExtension[]
): StudioContributions[T] {
  const pathArray = ['contributes', contributionPoint, ...subPath];

  return flattenConfigByProperty(pathArray.flat(), config).filter((item) =>
    has('component', item)
  ) as StudioContributions[T];
}

export function getApps(config: ProjectOptions[]): AppOptions[] | [] {
  const flattenedConfig = flattenConfigByProperty(['extensions'], config);
  const extensions = flattenedConfig.filter(
    (item: ProjectOptions | StudioExtension) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as StudioExtension[];
  return _getContributionPointConfig('apps', [], extensions) as AppOptions[] | [];
}
