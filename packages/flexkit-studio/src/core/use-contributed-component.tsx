import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { useConfig } from './config/config-context';
import { PluginOptions } from './config/types';
import type { LogoProps, ProjectSelectorProps, SearchProps, UserNavProps } from './config/types';
import type { FormFieldParams } from '../form/types';
import type { Image } from '../data-grid/preview-components/image';

interface ContributionPointMap {
  'navbar.logo': LazyExoticComponent<ComponentType<LogoProps>>;
  'navbar.projectSelector': LazyExoticComponent<ComponentType<ProjectSelectorProps>>;
  'navbar.search': LazyExoticComponent<ComponentType<SearchProps>>;
  'navbar.userNav': LazyExoticComponent<ComponentType<UserNavProps>>;
  'formFields.switch': LazyExoticComponent<ComponentType<FormFieldParams<'switch'>>>;
  'formFields.text': LazyExoticComponent<ComponentType<FormFieldParams<'text'>>>;
  'formFields.textarea': LazyExoticComponent<ComponentType<FormFieldParams<'textarea'>>>;
  'previewFields.boolean': LazyExoticComponent<ComponentType<{ value: boolean }>>;
  'previewFields.image': LazyExoticComponent<ComponentType<{ value: Image }>>;
  'previewFields.text': LazyExoticComponent<ComponentType<{ value: string }>>;
  'previewFields.editor': LazyExoticComponent<ComponentType<{ value: string }>>;
  'previewFields.datetime': LazyExoticComponent<ComponentType<{ value: string }>>;
}

const contributionPointMap: ContributionPointMap = {
  // navbar
  'navbar.logo': lazy(() => import('../ui/components/logo.js').then(({ Logo }) => ({ 'default': Logo }))),
  'navbar.projectSelector': lazy(() =>
    import('../ui/components/project-selector.js').then(({ ProjectSelector }) => ({ 'default': ProjectSelector }))
  ),
  'navbar.search': lazy(() => import('../ui/components/search.js').then(({ Search }) => ({ 'default': Search }))),
  'navbar.userNav': lazy(() => import('../ui/components/user-nav.js').then(({ UserNav }) => ({ 'default': UserNav }))),
  // form fields
  'formFields.switch': lazy(() => import('../form/fields/switch.js').then(({ Switch }) => ({ 'default': Switch }))),
  'formFields.text': lazy(() => import('../form/fields/text.js').then(({ Text }) => ({ 'default': Text }))),
  'formFields.textarea': lazy(() =>
    import('../form/fields/textarea.js').then(({ Textarea }) => ({ 'default': Textarea }))
  ),
  // preview fields
  'previewFields.boolean': lazy(() =>
    import('../data-grid/preview-components/boolean.js').then(({ Boolean }) => ({ 'default': Boolean }))
  ),
  'previewFields.image': lazy(() =>
    import('../data-grid/preview-components/image.js').then(({ Image }) => ({ 'default': Image }))
  ),
  'previewFields.text': lazy(() =>
    import('../data-grid/preview-components/text.js').then(({ Text }) => ({ 'default': Text }))
  ),
  'previewFields.editor': lazy(() =>
    import('../data-grid/preview-components/editor.js').then(({ Editor }) => ({ 'default': Editor }))
  ),
  'previewFields.datetime': lazy(() =>
    import('../data-grid/preview-components/datetime.js').then(({ DateTime }) => ({ 'default': DateTime }))
  ),
};

export function useContributedComponent<T extends keyof ContributionPointMap>(
  contributionPoint: T
): ContributionPointMap[T] {
  const { getContributionPointConfig } = useConfig();
  const [section, ...pathParts] = contributionPoint.split('.');
  const defaultComponent = contributionPointMap[contributionPoint];
  const contributionPointConfig = getContributionPointConfig(
    section as keyof PluginOptions['contributes'],
    pathParts
  ) as unknown as { component: ContributionPointMap[T] }[];

  return contributionPointConfig?.length > 0 ? contributionPointConfig[0]?.component : defaultComponent;
}
