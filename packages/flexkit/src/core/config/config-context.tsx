'use client';

import { createContext, useContext } from 'react';
import { has, path } from 'ramda';
import type { AppOptions, PluginOptions, ProjectOptions } from './types';

interface ConfigContext {
  projects: ProjectOptions[];
  plugins: PluginOptions[];
  contributions: {
    apps: AppOptions[];
  };
}

const ConfigContext = createContext<ConfigContext>({
  projects: [] as ProjectOptions[],
  plugins: [] as PluginOptions[],
  contributions: {
    apps: [] as AppOptions[],
  },
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
  const flattenedConfig = flattenConfigByProperty(['plugins'], config);
  const plugins = flattenedConfig.filter(
    (item: ProjectOptions | PluginOptions) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as PluginOptions[];
  const globalConfig = {
    projects: flattenedConfig.filter((item: ProjectOptions | PluginOptions) =>
      hasProjectIdProperty(item)
    ) as ProjectOptions[],
    plugins,
    contributions: {
      apps: getContributionPoint('apps', plugins),
    },
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
  return config.reduce<(ProjectOptions | PluginOptions)[]>((acc, curr) => {
    if (path(property, curr)) {
      return [...acc, curr, ...flattenConfigByProperty(property, path(property, curr) ?? [])];
    }

    return [...acc, curr];
  }, []);
}

function getContributionPoint<T extends keyof PluginOptions['contributes']>(
  contributionPoint: string,
  config: PluginOptions[]
): PluginOptions['contributes'][T][] {
  return flattenConfigByProperty(['contributes', contributionPoint], config).filter((item) =>
    has('component', item)
  ) as PluginOptions['contributes'][T][];
}

export function getApps(config: ProjectOptions[]): AppOptions[] {
  const flattenedConfig = flattenConfigByProperty(['plugins'], config);
  const plugins = flattenedConfig.filter(
    (item: ProjectOptions | PluginOptions) => !hasProjectIdProperty(item) && hasContributesProperty(item)
  ) as PluginOptions[];
  return getContributionPoint('apps', plugins);
}
