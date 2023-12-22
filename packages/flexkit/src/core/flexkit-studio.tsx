'use client';

import { useEffect, useState } from 'react';
import { debug } from 'debug';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '../ui/theme-context';
import { Layout } from '../ui/containers/layout';
import { Root } from '../ui/containers/root';
import { getApps } from './config/config-context';
import type { Config, ProjectOptions, SingleProject } from './config/types';

/**
 * AppContext:
 *   - global loader state
 *   - breadcrumbs
 *   - page title
 *   - scope
 *   - relationships (used by the Edit Relationship drawer)
 *
 * ActionsContext:
 *   - add, edit, delete entities
 *   - show modal dialogs
 *   - show notifications
 *   - dismiss modals
 *
 * Query params: sort, filter, page, pageSize
 * Path params: id specific entity
 */

export function FlexkitStudio({ config }: { config: Config }): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const log = debug('core:flexkit-studio');
  const configArray: ProjectOptions[] = Array.isArray(config)
    ? config.map((project) => mapConfig(project))
    : [mapConfig(config)];
  const apps = getApps(configArray);

  useEffect(() => {
    // ensure the DOM is available to prevent "document is not defined" error with react-router
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const router = createBrowserRouter([
    {
      path: '/studio',
      element: <Root config={configArray} />,
      children: [
        {
          path: '/studio/:projectId',
          element: <Layout version={{ current: '1.0.0', latest: '1.0.0', isCurrent: true }} />,
          children: apps.map((app) => ({
            path: app.name,
            element: app.component,
          })),
        },
      ],
    },
  ]);

  log('Init Studio');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

function mapConfig(project: SingleProject | ProjectOptions): ProjectOptions {
  return {
    basePath: project.basePath ?? '/',
    icon: project.icon,
    plugins: project.plugins,
    projectId: project.projectId,
    title: project.title,
  };
}
