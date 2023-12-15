import { useEffect, useRef, useState } from 'react';
import { Keyboard, MoreHorizontal, PackageCheck, PackageX, Palette, Settings, Wrench } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import type { AppOptions } from '../../core/config/types';
import { Button } from '../primitives/button';
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
  activeAppName: string;
  version: {
    current: string;
    latest: string;
    isCurrent: boolean;
  };
};

export function AppView({ apps, activeAppName, version }: Props): JSX.Element {
  const [activeApp, setActiveApp] = useState(activeAppName);
  const [appBarHeight, setAppBarHeight] = useState(0);
  const [visibleApps, setVisibleApps] = useState<AppOptions[]>(apps);
  const [additionalApps, setAdditionalApps] = useState<AppOptions[]>([]); // apps that are not visible in the sidebar due to lack of space
  const appBar = useRef<HTMLDivElement>(null);

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
  }, []);

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

  return (
    <div className="flex h-full">
      <TooltipProvider>
        <div className="flex flex-col h-full w-12 bg-muted" ref={appBar}>
          <div className="grow">
            <div className="grid grid-cols-1 w-12 h-auto">
              {visibleApps.map((app) => (
                <Button asChild className="h-12 w-12" key={app.name} variant="ghost">
                  <Tooltip>
                    <TooltipTrigger
                      asChild
                      className="h-12 p-2 rounded-none border-2 border-transparent data-[state=active]:border-l-current focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-2 focus-visible:border-ring focus-visible:rounded-sm"
                    >
                      <NavLink className="aria-[current]:bg-background aria-[current]:border-l-white" to={app.name}>
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
                    <TooltipTrigger className="flex justify-center items-center h-12 w-12 p-0 data-[state=open]:bg-muted text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-2 focus-visible:border-ring focus-visible:rounded-sm">
                      <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
                      <span className="sr-only">View additional apps</span>
                      <TooltipContent side="right">
                        <p>Additional apps</p>
                      </TooltipContent>
                    </TooltipTrigger>
                  </DropdownMenuTrigger>
                </Tooltip>
                <DropdownMenuContent align="start" className="w-56" side="right">
                  {additionalApps.map((app) => (
                    <DropdownMenuItem
                      asChild
                      key={app.name}
                      onSelect={() => {
                        setActiveApp(app.name);
                      }}
                    >
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
                <TooltipTrigger className="flex justify-center items-center h-12 w-12 p-0 data-[state=open]:bg-muted text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-2 focus-visible:border-ring focus-visible:rounded-sm">
                  <Settings className="w-5 h-5" strokeWidth={1.5} />
                  <span className="sr-only">Settings menu</span>
                  <TooltipContent side="right">
                    <p>Settings menu</p>
                  </TooltipContent>
                </TooltipTrigger>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-60" side="right">
              <DropdownMenuItem
                onSelect={() => {
                  //
                }}
              >
                <Keyboard className="mr-2 h-4 w-4" />
                <span>Command Menu</span>
                <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  //
                }}
              >
                <Palette className="mr-2 h-4 w-4" />
                <span>Theme</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  //
                }}
              >
                <Wrench className="mr-2 h-4 w-4" />
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
                    <PackageCheck className="mr-2 h-4 w-4" />
                    <span>Version {version.current}</span>
                  </>
                ) : (
                  <>
                    <PackageX className="mr-2 h-4 w-4" />
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
      <div className="w-full focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
        <Outlet />
      </div>
    </div>
  );
}
