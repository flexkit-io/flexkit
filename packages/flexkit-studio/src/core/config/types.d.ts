import type { ComponentType, ReactNode } from 'react';
import type { Attribute, Scopes } from '../types';
import type { FormFieldParams } from '../../form/types';

export interface LogoProps {
  theme: string | undefined;
  title: string;
}

interface ProjectSelectorProps {
  projectId: string;
  projects: ProjectOptions[];
}

interface SearchProps {
  onSelect: (item: { entityName: string; entityNamePlural: string; entityId: string }) => void;
  projectId: string;
}

export interface FormFieldProps extends FormFieldParams {}

type UserNavProps = {
  projectId: string;
};

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
    formFields?: {
      [key: string]: {
        component: (Props: FormFieldProps) => JSX.Element;
        description?: string;
      };
    };
    previewFields?: {
      [key: string]: {
        component: (Props: string | boolean | number | Date) => JSX.Element;
        description?: string;
      };
    };
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
  }[];
  // theme?: StudioTheme;
}

/**
 * If a single project is used, not specifying a basePath is acceptable
 */
export type SingleProject = Omit<ProjectOptions, 'basePath'> & {
  basePath?: string;
};

export type Config = SingleProject | ProjectOptions[];
