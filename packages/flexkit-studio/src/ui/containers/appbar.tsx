import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { MoreHorizontal, PackageCheck, PackageX, Settings, Wrench } from 'lucide-react';
import { createPath, Link, NavLink, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../primitives/button';
import { getAppSegment } from '../../core/apps/app-sessions';
import type { AppSessions } from '../../core/apps/app-sessions';
import type { AppOptions } from '../../core/config/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../primitives/dropdown-menu';

type Props = {
  /** The app the URL points at, if it is a known one. */
  activeApp: string | undefined;
  apps: AppOptions[];
  /** Where each opened app was last left; its button leads back there. */
  sessions: AppSessions;
  version: {
    current: string;
    latest: string;
    isCurrent: boolean;
  };
};

export function AppBar({ activeApp: currentApp, apps, sessions, version }: Props): JSX.Element {
  const [appBarHeight, setAppBarHeight] = useState(0);
  const [visibleApps, setVisibleApps] = useState<AppOptions[]>(apps);
  const [additionalApps, setAdditionalApps] = useState<AppOptions[]>([]); // apps that are not visible in the sidebar due to lack of space
  const appBar = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { projectId = '' } = useParams();
  const appSegment = getAppSegment(location.pathname, projectId);
  const activeApp = currentApp ?? apps[0]?.name;

  /** An opened app reopens on the page it was left on; the others open on their root. */
  function getAppPath(app: AppOptions): string {
    const lastLocation = sessions.locations[app.name];

    return lastLocation ? createPath(lastLocation) : `/${projectId}/${app.name}`;
  }

  useEffect(() => {
    if (appBar.current === null) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setAppBarHeight(appBar.current?.offsetHeight ?? 0);
    });

    resizeObserver.observe(appBar.current);

    return function cleanup() {
      resizeObserver.disconnect();
    };
  }, [currentApp]);

  useEffect(() => {
    const availableAppSlots = Math.floor(appBarHeight / 48) - 2;
    const _visibleApps = apps.slice(0, availableAppSlots);

    if (!_visibleApps.find((app) => app.name === activeApp)) {
      // if the currently active app is not in the visible apps, add it to the end of the visible apps
      const _activeApp = apps.find((app) => app.name === activeApp);
      _visibleApps.pop();
      _activeApp ? _visibleApps.push(_activeApp) : null;
    }

    const _additionalApps = apps.filter((app) => !_visibleApps.includes(app));

    setVisibleApps(_visibleApps);
    setAdditionalApps(_additionalApps);
  }, [apps, activeApp, appBarHeight]);

  // A bare project URL opens the first app. An unknown app segment is left
  // alone (the outlet reports it) rather than redirected in a loop.
  if (appSegment === undefined && activeApp) {
    return <Navigate replace to={`${location.pathname.replace(/\/$/, '')}/${activeApp}`} />;
  }

  return (
    <TooltipProvider>
      <div className="fk:flex fk:flex-col fk:h-full fk:w-12 fk:bg-muted" ref={appBar}>
        <div className="fk:grow">
          <div className="fk:grid fk:grid-cols-1 fk:w-12 fk:h-auto">
            {visibleApps.map((app) => (
              <Button asChild className="fk:h-12 fk:w-12" key={app.name} variant="ghost">
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    className="fk:h-12 fk:p-2 fk:rounded-none fk:border-2 fk:border-transparent! fk:data-[state=active]:border-l-foreground! fk:focus-visible:outline-hidden fk:focus-visible:ring-0 fk:focus-visible:ring-offset-0 fk:focus-visible:border-2! fk:focus-visible:border-ring! fk:focus-visible:rounded-xs fk:corner-squircle"
                  >
                    <NavLink
                      className="fk:text-muted-foreground fk:aria-[current]:text-foreground fk:aria-[current]:bg-background fk:aria-[current]:border-l-white!"
                      to={getAppPath(app)}
                    >
                      {app.icon}
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{app.title}</p>
                  </TooltipContent>
                </Tooltip>
              </Button>
            ))}
          </div>
          {/* additional apps */}
          {additionalApps.length > 0 && (
            <DropdownMenu>
              <Tooltip>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger className="fk:flex fk:justify-center fk:items-center fk:h-12 fk:w-12 p-0 fk:data-[state=open]:bg-muted fk:text-muted-foreground fk:transition-colors fk:focus-visible:outline-hidden fk:focus-visible:border-2 fk:focus-visible:border-ring fk:focus-visible:rounded-xs">
                    <MoreHorizontal className="fk:w-5 fk:h-5" strokeWidth={1.5} />
                    <span className="fk:sr-only">View additional apps</span>
                    <TooltipContent side="right">
                      <p>Additional apps</p>
                    </TooltipContent>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent align="start" className="fk:w-56" side="right">
                {additionalApps.map((app) => (
                  <DropdownMenuItem asChild key={app.name}>
                    <NavLink to={getAppPath(app)}>{app.title}</NavLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {/* settings button */}
        <DropdownMenu>
          <Tooltip>
            <DropdownMenuTrigger asChild>
              <TooltipTrigger className="fk:flex fk:justify-center fk:items-center fk:h-12 fk:w-12 fk:p-0 fk:data-[state=open]:bg-muted fk:text-muted-foreground fk:transition-colors fk:focus-visible:outline-hidden fk:focus-visible:border-2 fk:focus-visible:border-ring fk:focus-visible:rounded-xs">
                <Settings className="fk:w-5 fk:h-5" strokeWidth={1.5} />
                <span className="fk:sr-only">Settings menu</span>
                <TooltipContent side="right">
                  <p>Settings menu</p>
                </TooltipContent>
              </TooltipTrigger>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="start" className="fk:w-60" side="right">
            {/* TODO: add command menu functionality */}
            {/* <DropdownMenuItem
              onSelect={() => {
                //
              }}
            >
              <Keyboard className="fk:mr-2 fk:h-4 fk:w-4" />
              <span>Command Menu</span>
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator /> */}
            {/* TODO: add theme menu functionality - perhaps a Slack-like theme selector */}
            {/* <DropdownMenuItem
              onSelect={() => {
                //
              }}
            >
              <Palette className="fk:mr-2 fk:h-4 fk:w-4" />
              <span>Theme</span>
            </DropdownMenuItem> */}
            <DropdownMenuItem asChild>
              <Link to={`https://flexkit.io/dashboard/*/${projectId}`} target="_blank" rel="noopener noreferrer">
                <Wrench className="fk:mr-2 fk:h-4 fk:w-4" />
                <span>Manage project</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={version.isCurrent}
              onSelect={() => {
                if (!version.isCurrent) {
                  // TODO: open upgrade modal
                }
              }}
            >
              {version.isCurrent ? (
                <>
                  <PackageCheck className="fk:mr-2 fk:h-4 fk:w-4" />
                  <span>Version {version.current}</span>
                </>
              ) : (
                <>
                  <PackageX className="fk:mr-2 fk:h-4 fk:w-4" />
                  <span>
                    Version {version.current}.<br />
                    Upgrade to {version.latest}
                  </span>
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
