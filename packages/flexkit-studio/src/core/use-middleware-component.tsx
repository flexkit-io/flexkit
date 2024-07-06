import { createElement, lazy } from 'react';
import type { ComponentType, LazyExoticComponent, ReactElement, ReactNode } from 'react';
import type { SearchProps } from '../ui/components/search';
import { useConfig } from './config/config-context';
import type { ProjectOptions } from './config/types';

type Props = {
  contributionPoint: 'navbar.logo' | 'navbar.projectSelector' | 'navbar.search' | 'navbar.userNav';
};

interface LogoProps {
  title: string;
}

interface ProjectSelectorProps {
  projectId: string;
  projects: ProjectOptions[];
}

type UserNavProps = {
  projectId: string;
};

type MiddlewareProps = {
  renderDefault?: (props: LogoProps | ProjectSelectorProps | SearchProps | UserNavProps) => ReactNode;
} & (LogoProps & ProjectSelectorProps & SearchProps & UserNavProps);

interface ContributionPointMap {
  'navbar.logo': LazyExoticComponent<ComponentType<LogoProps>>;
  'navbar.projectSelector': LazyExoticComponent<ComponentType<ProjectSelectorProps>>;
  'navbar.search': LazyExoticComponent<ComponentType<SearchProps>>;
  'navbar.userNav': LazyExoticComponent<ComponentType<UserNavProps>>;
}

const contributionPointMap: ContributionPointMap = {
  'navbar.logo': lazy(() => import('../ui/components/logo.js').then(({ Logo }) => ({ 'default': Logo }))),
  'navbar.projectSelector': lazy(() =>
    import('../ui/components/project-selector.js').then(({ ProjectSelector }) => ({ 'default': ProjectSelector }))
  ),
  'navbar.search': lazy(() => import('../ui/components/search.js').then(({ Search }) => ({ 'default': Search }))),
  'navbar.userNav': lazy(() => import('../ui/components/user-nav.js').then(({ UserNav }) => ({ 'default': UserNav }))),
};

function createMiddlewareComponent<T extends MiddlewareProps>(
  DefaultComponent: ComponentType<T>,
  middlewareComponents: { component: ComponentType<T> }[]
): ComponentType<T> {
  return (props: T): ReactElement => {
    let renderDefault = (innerProps: T): ReactElement => <DefaultComponent {...innerProps} />;

    for (const middleware of middlewareComponents) {
      const Next = renderDefault;

      renderDefault = (innerProps: T): ReactElement =>
        createElement(middleware.component, { ...innerProps, renderDefault: Next });
    }

    return renderDefault(props);
  };
}

export function useMiddlewareComponent({
  contributionPoint,
}: Props): ComponentType<LogoProps | ProjectSelectorProps | SearchProps | UserNavProps> {
  const { getContributionPointConfig } = useConfig();
  const contributionPointConfig = getContributionPointConfig(contributionPoint.split('.'));
  const result = createMiddlewareComponent(contributionPointMap[contributionPoint], contributionPointConfig);

  return result as unknown as ComponentType<LogoProps | ProjectSelectorProps | SearchProps | UserNavProps>;
}
