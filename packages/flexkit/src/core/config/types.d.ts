import type { ComponentType, ReactNode } from 'react';

export interface AppOptions {
  name: string;
  title: string;
  icon?: JSX.Element;
  component: ReactNode;
}

export interface PluginOptions {
  name: string;
  title?: string;
  contributes?: {
    apps?: AppOptions[];
    formFields?: { [key: string]: unknown };
    commands?: CommandOptions[];
  };
  plugins?: PluginOptions[];
  schema?: SchemaPluginOptions;
}

export interface ProjectOptions {
  title?: string;
  projectId: string;
  basePath: string;
  icon?: ComponentType;
  plugins?: PluginOptions[];
  // theme?: StudioTheme;
}

/**
 * If a single project is used, not specifying a name or basePath is acceptable
 */
export type SingleProject = Omit<ProjectOptions, 'name' | 'basePath'> & {
  name?: string;
  basePath?: string;
};

export type Config = SingleProject | ProjectOptions[];
