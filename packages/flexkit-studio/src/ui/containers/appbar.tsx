import { useEffect, useRef, useState } from 'react';
import { Keyboard, MoreHorizontal, PackageCheck, PackageX, Palette, Settings, Wrench } from 'lucide-react';
import { NavLink, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../primitives/button';
import type { AppOptions } from '../../core/config/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '../primitives/dropdown-menu';

type Props = {
  apps: AppOptions[];
  version: {
    current: string;
    latest: string;
    isCurrent: boolean;
  };
};

export function AppBar({ apps, version }: Props): JSX.Element {
  const [appBarHeight, setAppBarHeight] = useState(0);
  const [visibleApps, setVisibleApps] = useState<AppOptions[]>(apps);
  const [additionalApps, setAdditionalApps] = useState<AppOptions[]>([]); // apps that are not visible in the sidebar due to lack of space
  const appBar = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { projectId } = useParams();
  const currentAppSegmentPath = apps.find((app) => location.pathname.includes(`/${projectId}/${app.name}`))?.name;
  const activeApp = apps.find((app) => location.pathname.includes(`/${projectId}/${app.name}`))?.name ?? apps[0].name;

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
  }, [currentAppSegmentPath]);

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

  if (currentAppSegmentPath === undefined) {
    return <Navigate to={`${location.pathname}/${activeApp}`} />;
  }

  return (
    <TooltipProvider>
      <div className="fk-flex fk-flex-col fk-h-full fk-w-12 fk-bg-muted" ref={appBar}>
        <div className="fk-grow">
          <div className="fk-grid fk-grid-cols-1 fk-w-12 fk-h-auto">
            {visibleApps.map((app) => (
              <Button asChild className="fk-h-12 fk-w-12" key={app.name} variant="ghost">
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    className="fk-h-12 fk-p-2 fk-rounded-none fk-border-2 fk-border-transparent data-[state=active]:fk-border-l-current focus-visible:fk-outline-none focus-visible:fk-ring-0 focus-visible:fk-ring-offset-0 focus-visible:fk-border-2 focus-visible:fk-border-ring focus-visible:fk-rounded-sm"
                  >
                    <NavLink
                      className="fk-text-muted-foreground aria-[current]:fk-text-foreground aria-[current]:fk-bg-background aria-[current]:fk-border-l-white"
                      to={app.name}
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
                  <TooltipTrigger className="fk-flex justify-center fk-items-center fk-h-12 fk-w-12 p-0 fk-data-[state=open]:bg-muted fk-text-muted-foreground fk-transition-colors fk-focus-visible:outline-none fk-focus-visible:border-2 fk-focus-visible:border-ring fk-focus-visible:rounded-sm">
                    <MoreHorizontal className="fk-w-5 fk-h-5" strokeWidth={1.5} />
                    <span className="fk-sr-only">View additional apps</span>
                    <TooltipContent side="right">
                      <p>Additional apps</p>
                    </TooltipContent>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
              </Tooltip>
              <DropdownMenuContent align="start" className="fk-w-56" side="right">
                {additionalApps.map((app) => (
                  <DropdownMenuItem asChild key={app.name}>
                    <NavLink to={app.name}>{app.title}</NavLink>
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
              <TooltipTrigger className="fk-flex fk-justify-center fk-items-center fk-h-12 fk-w-12 fk-p-0 fk-data-[state=open]:bg-muted fk-text-muted-foreground fk-transition-colors fk-focus-visible:outline-none fk-focus-visible:border-2 fk-focus-visible:border-ring fk-focus-visible:rounded-sm">
                <Settings className="fk-w-5 fk-h-5" strokeWidth={1.5} />
                <span className="fk-sr-only">Settings menu</span>
                <TooltipContent side="right">
                  <p>Settings menu</p>
                </TooltipContent>
              </TooltipTrigger>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="start" className="fk-w-60" side="right">
            <DropdownMenuItem
              onSelect={() => {
                //
              }}
            >
              <Keyboard className="fk-mr-2 fk-h-4 fk-w-4" />
              <span>Command Menu</span>
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                //
              }}
            >
              <Palette className="fk-mr-2 fk-h-4 fk-w-4" />
              <span>Theme</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                //
              }}
            >
              <Wrench className="fk-mr-2 fk-h-4 fk-w-4" />
              <span>Manage project</span>
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
                  <PackageCheck className="fk-mr-2 fk-h-4 fk-w-4" />
                  <span>Version {version.current}</span>
                </>
              ) : (
                <>
                  <PackageX className="fk-mr-2 fk-h-4 fk-w-4" />
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
