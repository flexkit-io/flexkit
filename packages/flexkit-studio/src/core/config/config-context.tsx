'use client';

import { createContext, useContext } from 'react';
import { has, path } from 'ramda';
import { useParams } from 'react-router-dom';
import type { AppOptions, PluginOptions, ProjectOptions } from './types';

interface ConfigContext {
  projects: ProjectOptions[];
  plugins: PluginOptions[];
  contributions: {
    apps: AppOptions[];
  };
  getContributionPointConfig: <T extends keyof PluginOptions['contributes']>(
    contributionPoint: string | string[]
  ) => PluginOptions['contributes'][T][];
}

const ConfigContext = createContext<ConfigContext>({
  projects: [] as ProjectOptions[],
  plugins: [] as PluginOptions[],
  contributions: {
    apps: [] as AppOptions[],
  },
  getContributionPointConfig: () => [],
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
  const { projectId: currentProjectId } = useParams<{ projectId: string }>();
  const globalFlattenedConfig = flattenConfigByProperty(['plugins'], config);
  const currentProjectFlattenedConfig = flattenConfigByProperty(
    ['plugins'],
    config.filter((item) => item.projectId === currentProjectId)
  );
  const allPlugins = globalFlattenedConfig.filter(
    (item: ProjectOptions | PluginOptions) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as PluginOptions[];
  const currentProjectPlugins = currentProjectFlattenedConfig.filter(
    (item: ProjectOptions | PluginOptions) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as PluginOptions[];
  const globalConfig = {
    projects: globalFlattenedConfig.filter((item: ProjectOptions | PluginOptions) =>
      hasProjectIdProperty(item)
    ) as ProjectOptions[],
    plugins: allPlugins,
    contributions: {
      apps: _getContributionPointConfig('apps', currentProjectPlugins),
    },
    getContributionPointConfig: <T extends keyof PluginOptions['contributes']>(
      contributionPoint: string | string[]
    ): PluginOptions['contributes'][T][] => _getContributionPointConfig(contributionPoint, currentProjectPlugins),
  };

  return <ConfigContext.Provider value={globalConfig}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContext {
  return useContext(ConfigContext);
}

function flattenConfigByProperty(
  property: string[],
  config: (ProjectOptions | PluginOptions)[]
): (ProjectOptions | PluginOptions)[] {
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

function _getContributionPointConfig<T extends keyof PluginOptions['contributes']>(
  contributionPoint: string | string[],
  config: PluginOptions[]
): PluginOptions['contributes'][T][] {
  return flattenConfigByProperty(['contributes', contributionPoint].flat(), config).filter((item) =>
    has('component', item)
  ) as PluginOptions['contributes'][T][];
}

export function getApps(config: ProjectOptions[]): AppOptions[] {
  const flattenedConfig = flattenConfigByProperty(['plugins'], config);
  const plugins = flattenedConfig.filter(
    (item: ProjectOptions | PluginOptions) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as PluginOptions[];
  return _getContributionPointConfig('apps', plugins);
}
