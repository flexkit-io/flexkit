'use client';

import { useEffect, useState } from 'react';
import type { ComponentType, JSX } from 'react';
import { debug } from 'debug';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import type { RouterProviderProps } from 'react-router-dom';
import { ThemeProvider } from '../ui/theme-context';
import { Layout } from '../ui/containers/layout';
import { Root } from '../ui/containers/root';
import { ActionsProvider } from '../entities/actions-context';
import { AppProvider } from './app-context';
import { builtInApps } from './apps/built-in-apps';
import { normalizeBasePath } from './base-path';
import { GlobalError } from './error/global-error';
import { ErrorBoundary } from './error/error-boundary';
import type { FlexkitStudioProps } from './config/types';

const RouterProviderCompat = RouterProvider as unknown as ComponentType<RouterProviderProps>;
type BrowserRoutes = Parameters<typeof createBrowserRouter>[0];

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
 *
 * The Studio renders the schema deployed to each project (`flexkit deploy`);
 * the host only tells it which projects exist and where it is mounted.
 */
export function FlexkitStudio({ projectIds, basename }: FlexkitStudioProps): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const log = debug('core:flexkit-studio');

  useEffect(() => {
    // ensure the DOM is available to prevent "document is not defined" error with react-router
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (projectIds.length === 0) {
    throw new Error('FlexkitStudio needs at least one project id: <FlexkitStudio projectIds={["..."]} />');
  }

  const routes = [
    {
      path: '/',
      element: <Root projectIds={projectIds} />,
      errorElement: <GlobalError />,
      children: [
        {
          path: ':projectId',
          element: <Layout version={{ current: '1.0.0', latest: '1.0.0', isCurrent: true }} />,
          children: builtInApps.map((app) => ({
            path: app.name,
            element: app.component,
            errorElement: <ErrorBoundary />,
            children: app.routes?.map((route) => ({
              path: route.path,
              element: route.component,
              errorElement: <ErrorBoundary />,
              children: route.children?.map((child) => ({ path: child.path, element: child.component })),
            })),
          })),
        },
      ],
    },
  ] as unknown as BrowserRoutes;
  const router = createBrowserRouter(routes, { basename: normalizeBasePath(basename) });

  log('Init Studio');

  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      <AppProvider>
        <ActionsProvider>
          <RouterProviderCompat router={router} />
        </ActionsProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
