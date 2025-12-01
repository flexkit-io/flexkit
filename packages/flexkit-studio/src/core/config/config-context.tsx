'use client';

import { createContext, useContext, useMemo } from 'react';
import { has, path } from 'ramda';
import { useParams } from 'react-router-dom';
import { assetSchema } from '../../entities/assets-schema';
import { tagSchema } from '../../entities/tags-schema';
import type { AppOptions, PluginOptions, ProjectOptions } from './types';
import type { Entity } from '../types';

type Contributes = NonNullable<PluginOptions['contributes']>;
export interface ConfigContext {
  contributions: {
    apps: AppOptions[] | [];
  };
  currentProjectId?: string;
  currentProjectSchema: Entity[];
  getContributionPointConfig: <T extends keyof Contributes>(
    contributionPoint: T,
    subPath?: string[]
  ) => Contributes[T][] | [];
  plugins: PluginOptions[];
  projects: ProjectOptions[];
}

const ConfigContext = createContext<ConfigContext>({
  contributions: {
    apps: [],
  },
  currentProjectId: undefined,
  currentProjectSchema: [],
  getContributionPointConfig: () => [],
  plugins: [] as PluginOptions[],
  projects: [] as ProjectOptions[],
});
const hasProjectIdProperty = (configItem: ProjectOptions | PluginOptions): boolean =>
  Object.prototype.hasOwnProperty.call(configItem, 'projectId');
const hasContributesProperty = (configItem: ProjectOptions | PluginOptions): boolean =>
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

  const globalFlattenedConfig = useMemo(() => flattenConfigByProperty(['plugins'], enhancedConfig), [enhancedConfig]);
  const currentProjectFlattenedConfig = useMemo(
    () =>
      flattenConfigByProperty(
        ['plugins'],
        enhancedConfig.filter((item) => item.projectId === currentProjectId)
      ),
    [enhancedConfig, currentProjectId]
  );
  const allPlugins = globalFlattenedConfig.filter(
    (item: ProjectOptions | PluginOptions) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as PluginOptions[];
  const currentProjectPlugins = currentProjectFlattenedConfig.filter(
    (item: ProjectOptions | PluginOptions) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as PluginOptions[];

  const globalConfig = useMemo(
    () => ({
      contributions: {
        apps: _getContributionPointConfig('apps', [], currentProjectPlugins),
      },
      currentProjectId,
      currentProjectSchema: enhancedConfig.find((item) => item.projectId === currentProjectId)?.schema ?? [],
      getContributionPointConfig: <T extends keyof Contributes>(
        contributionPoint: T,
        subPath: string[] = []
      ): Contributes[T][] =>
        _getContributionPointConfig(contributionPoint, subPath, currentProjectPlugins) as Contributes[T][],
      plugins: allPlugins,
      projects: globalFlattenedConfig.filter((item: ProjectOptions | PluginOptions) =>
        hasProjectIdProperty(item)
      ) as ProjectOptions[],
    }),
    [allPlugins, currentProjectId, currentProjectPlugins, globalFlattenedConfig]
  );

  return (
    <ConfigContext.Provider
      value={{
        ...globalConfig,
        contributions: {
          ...globalConfig.contributions,
          apps: globalConfig.contributions.apps as AppOptions[] | [],
        },
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContext {
  return useContext(ConfigContext);
}

function flattenConfigByProperty(
  property: string[],
  config: (ProjectOptions | PluginOptions)[]
): (ProjectOptions | PluginOptions)[] | [] {
  if (!Array.isArray(config)) {
    return [config];
  }

  return config.reduce<(ProjectOptions | PluginOptions)[]>((acc, curr) => {
    if (path(property, curr)) {
      return [...acc, curr, ...flattenConfigByProperty(property, path(property, curr) ?? [])];
    }

    return [...acc, curr];
  }, []);
}

function _getContributionPointConfig<T extends keyof Contributes>(
  contributionPoint: T,
  subPath: string[] = [],
  config: PluginOptions[]
): Contributes[T] {
  const pathArray = ['contributes', contributionPoint, ...subPath];

  return flattenConfigByProperty(pathArray.flat(), config).filter((item) => has('component', item)) as Contributes[T];
}

export function getApps(config: ProjectOptions[]): AppOptions[] | [] {
  const flattenedConfig = flattenConfigByProperty(['plugins'], config);
  const plugins = flattenedConfig.filter(
    (item: ProjectOptions | PluginOptions) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as PluginOptions[];
  return _getContributionPointConfig('apps', [], plugins) as AppOptions[] | [];
}
