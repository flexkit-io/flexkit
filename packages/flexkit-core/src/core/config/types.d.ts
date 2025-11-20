import type { ComponentType, ReactNode } from 'react';
import type { Attribute, Scopes } from '../types';
import type { FormFieldParams } from '../../form/types';
import type { Entity } from '../types';
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
  schema: Entity[];
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

type PreviewComponent<T = unknown> = React.ComponentType<{ value: T }>;

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
        component: ({ value }: { value: string | boolean | number | null | Date | Image }) => JSX.Element | null;
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
  menuGroups?: {
    title: string;
    name: string;
  }[];
  plugins?: PluginOptions[];
  scopes?: Scopes;
  schema: Entity[];
}

/**
 * If a single project is used, not specifying a basePath is acceptable
 */
export type SingleProject = Omit<ProjectOptions, 'basePath'> & {
  basePath?: string;
};

export type Config = SingleProject | ProjectOptions[];
