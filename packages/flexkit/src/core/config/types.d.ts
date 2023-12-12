import type { ComponentType, FC } from 'react';

export interface AppOptions {
  name: string;
  title: string;
  icon?: JSX.Element;
  component: FC;
}

export interface SourceOptions extends PluginOptions {
  title?: string;

  /**
   * Project ID for this source
   */
  projectId: string;

  /**
   * Dataset name for this source
   */
  dataset: string;
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

export interface WorkspaceOptions extends SourceOptions {
  basePath: string;
  subtitle?: string;
  logo?: ComponentType;
  icon?: ComponentType;
  // theme?: StudioTheme;
}

/**
 * If a single workspace is used, not specifying a name or basePath is acceptable
 */
export type SingleWorkspace = Omit<WorkspaceOptions, 'name' | 'basePath'> & {
  name?: string;
  basePath?: string;
};

export type Config = SingleWorkspace | WorkspaceOptions[];
