import type { ComponentType, ReactNode } from 'react';
import type { Attribute, Scopes } from '../types';

export interface LogoProps {
  title: string;
  renderDefault: (props: Omit<LogoProps, 'renderDefault'>) => JSX.Element;
}

interface ProjectSelectorProps {
  projectId: string;
  projects: ProjectOptions[];
  renderDefault: (props: Omit<ProjectSelectorProps, 'renderDefault'>) => JSX.Element;
}

export interface SearchProps {
  renderDefault: (props: Omit<SearchProps, 'renderDefault'>) => JSX.Element;
}

export interface AppOptions {
  name: string;
  title: string;
  icon?: JSX.Element;
  component: ReactNode;
  routes?: AppRoute[];
}

export interface AppRoute {
  path: string;
  component: ReactNode;
  children?: AppRoute[];
}

export interface PluginOptions {
  name: string;
  title?: string;
  contributes?: {
    apps?: AppOptions[];
    formFields?: { [key: string]: unknown };
    commands?: CommandOptions[];
    navbar?: {
      logo?: {
        component: (Props: LogoProps) => JSX.Element;
      };
      projectSelector?: {
        component: (Props: ProjectSelectorProps) => JSX.Element;
      };
      search?: {
        component: (Props: SearchProps) => JSX.Element;
      };
    };
  };
  plugins?: PluginOptions[];
}

export interface ProjectOptions {
  title?: string;
  projectId: string;
  basePath: string;
  icon?: ComponentType;
  plugins?: PluginOptions[];
  scopes?: Scopes;
  schema: {
    name: string;
    plural: string;
    attributes: Attribute[];
  }[]; // TODO: Add schema type
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
