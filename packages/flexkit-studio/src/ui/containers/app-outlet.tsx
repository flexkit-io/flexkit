import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import { AlertCircle } from 'lucide-react';
import { useLocation, useRoutes } from 'react-router-dom';
import type { Location, RouteObject } from 'react-router-dom';
import { AppActiveContext } from '../../core/apps/app-active';
import { createAppSessions, getAppSegment, rememberAppLocation } from '../../core/apps/app-sessions';
import type { AppSessions } from '../../core/apps/app-sessions';
import type { AppOptions, AppRoute } from '../../core/config/types';
import { RouteErrorBoundary } from '../../core/error/error-boundary';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert';

export interface AppSessionState {
  /** The app the URL points at, if it is one of `apps`. */
  activeApp: string | undefined;
  sessions: AppSessions;
}

/**
 * Tracks which app is in front and where every opened app was last left.
 * The state is adjusted during render (the React-sanctioned pattern for
 * state derived from the previous render) so the app bar and the outlet
 * never see a location that belongs to a different app than the URL.
 */
export function useAppSessions(apps: AppOptions[], projectId: string): AppSessionState {
  const location = useLocation();
  const [sessions, setSessions] = useState(() => createAppSessions(projectId));
  const segment = getAppSegment(location.pathname, projectId);
  const activeApp = segment !== undefined && apps.some((app) => app.name === segment) ? segment : undefined;
  const next = activeApp
    ? rememberAppLocation(sessions, projectId, activeApp, location)
    : sessions.projectId === projectId
      ? sessions
      : createAppSessions(projectId);

  if (next !== sessions) {
    setSessions(next);
  }

  return { activeApp, sessions: next };
}

function toRouteObject(route: AppRoute): RouteObject {
  return {
    children: route.children?.map(toRouteObject),
    element: <RouteErrorBoundary>{route.component}</RouteErrorBoundary>,
    path: route.path,
  };
}

/**
 * Renders one app against the location it was last seen at. Passing the
 * location to `useRoutes` scopes `useLocation`, `useParams` and relative
 * links inside the app to it, so an app that is hidden behind another one
 * keeps rendering the page it was left on instead of reacting to the URL
 * of the app in front.
 */
function AppRoutes({ app, location }: { app: AppOptions; location: Location }): JSX.Element | null {
  const routes = useMemo<RouteObject[]>(
    () => [
      {
        children: app.routes?.map(toRouteObject),
        element: <RouteErrorBoundary>{app.component}</RouteErrorBoundary>,
        path: app.name,
      },
    ],
    [app]
  );

  return useRoutes(routes, location);
}

function AppNotFound({ segment }: { segment: string }): JSX.Element {
  return (
    <div className="fk:flex fk:h-full fk:grow fk:items-center fk:justify-center fk:p-8">
      <Alert className="fk:max-w-lg" variant="destructive">
        <AlertCircle className="fk:h-4 fk:w-4" />
        <AlertTitle>App not found</AlertTitle>
        <AlertDescription>There is no Studio app named &quot;{segment}&quot;.</AlertDescription>
      </Alert>
    </div>
  );
}

type Props = AppSessionState & {
  apps: AppOptions[];
};

/**
 * The Studio's app area. Every app that has been opened stays mounted; the
 * one the URL points at is shown and the others are hidden with
 * `display: none`, so switching tabs and back keeps a chat, a half-filled
 * form or an explorer query exactly as it was. The shown app's wrapper uses
 * `display: contents` so the app itself stays a flex item of the layout row.
 */
export function AppOutlet({ activeApp, apps, sessions }: Props): JSX.Element {
  const location = useLocation();
  const segment = getAppSegment(location.pathname, sessions.projectId);

  return (
    <>
      {sessions.order.map((name) => {
        const app = apps.find((item) => item.name === name);
        const appLocation = sessions.locations[name];

        if (!app || !appLocation) {
          return null;
        }

        const isActive = name === activeApp;

        return (
          <div
            aria-hidden={isActive ? undefined : true}
            data-studio-app={name}
            key={name}
            style={{ display: isActive ? 'contents' : 'none' }}
          >
            <AppActiveContext.Provider value={isActive}>
              <AppRoutes app={app} location={appLocation} />
            </AppActiveContext.Provider>
          </div>
        );
      })}
      {activeApp === undefined && segment !== undefined ? <AppNotFound segment={segment} /> : null}
    </>
  );
}
