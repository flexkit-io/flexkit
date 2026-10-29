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
import { normalizeBasePath } from './base-path';
import { installErrorReporter } from './error/error-reporter';
import { installProductEvents } from './analytics/product-events';
import { GlobalError } from './error/global-error';
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
 * The Studio renders the schema deployed to each project (`flexkit deploy`).
 * The host either lists the projects (`projectIds`) or omits them, in which
 * case the Studio signs the user in and lists every project they can access.
 */
export function FlexkitStudio({ projectIds, basename }: FlexkitStudioProps): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const log = debug('core:flexkit-studio');

  useEffect(() => {
    // ensure the DOM is available to prevent "document is not defined" error with react-router
    setMounted(true);
  }, []);

  // Hosted mode (`projectIds` omitted) is the hosted Studio and the desktop app.
  const hosted = projectIds === undefined;

  useEffect(() => installErrorReporter({ hosted }), [hosted]);
  useEffect(() => installProductEvents({ hosted }), [hosted]);

  if (!mounted) {
    return null;
  }

  // `projectIds` omitted = hosted mode (the Studio lists the user's projects); an empty list is a host bug.
  if (projectIds !== undefined && projectIds.length === 0) {
    throw new Error(
      'FlexkitStudio needs at least one project id: <FlexkitStudio projectIds={["..."]} />. Omit the prop for hosted mode.'
    );
  }

  const routes = [
    {
      path: '/',
      element: <Root projectIds={projectIds} />,
      errorElement: <GlobalError />,
      children: [
        {
          // The apps are rendered by the Layout (see `AppOutlet`), which keeps
          // every opened app mounted; the splat hands it the rest of the path.
          path: ':projectId/*',
          element: <Layout />,
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
