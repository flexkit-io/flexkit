import { useEffect, useRef, useState } from 'react';
import { Keyboard, MoreHorizontal, PackageCheck, PackageX, Palette, Settings, Wrench } from 'lucide-react';
import type { AppOptions } from '../../core/config/types';
import { Button } from '../primitives/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
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

export function AppView({ apps, version }: Props): JSX.Element {
  // the currently selected app should come via props from the router, since it is reflected in the URL as a path segment
  const [activeApp, setActiveApp] = useState('desk');
  const [appBarHeight, setAppBarHeight] = useState(0);
  const [visibleApps, setVisibleApps] = useState<AppOptions[]>(apps);
  const [additionalApps, setAdditionalApps] = useState<AppOptions[]>([]); // apps that are not visible in the sidebar
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

  function onAppChange(value: string): void {
    setActiveApp(value);
  }

  return (
    <Tabs
      className="flex h-full"
      defaultValue="desk"
      onValueChange={onAppChange}
      orientation="vertical"
      value={activeApp}
    >
      <div className="flex flex-col h-full bg-muted" ref={appBar}>
        <div className="grow">
          <TabsList className="grid grid-cols-1 w-12 h-auto p-0 rounded-none">
            <TooltipProvider>
              {visibleApps.map((app) => (
                <Tooltip key={app.name}>
                  <TooltipTrigger>
                    <TabsTrigger
                      className="h-12 p-2 rounded-none border-l-2 data-[state=active]:border-current"
                      value={app.name}
                    >
                      {app.icon}
                    </TabsTrigger>
                    <TooltipContent side="right">
                      <p>{app.title}</p>
                    </TooltipContent>
                  </TooltipTrigger>
                </Tooltip>
              ))}
            </TooltipProvider>
          </TabsList>
          {additionalApps.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="flex h-12 w-12 p-0 data-[state=open]:bg-muted text-muted-foreground" variant="ghost">
                  <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
                  <span className="sr-only">View additional apps</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56" side="right">
                {additionalApps.map((app) => (
                  <DropdownMenuItem
                    key={app.name}
                    onSelect={() => {
                      setActiveApp(app.name);
                    }}
                  >
                    {app.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {/* settings button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="flex h-12 w-12 p-0 data-[state=open]:bg-muted text-muted-foreground" variant="ghost">
              <Settings className="w-5 h-5" strokeWidth={1.5} />
              <span className="sr-only">Settings menu</span>
            </Button>
          </DropdownMenuTrigger>
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
      {apps.map((app) => (
        <TabsContent key={app.name} value={app.name}>
          <app.component />
        </TabsContent>
      ))}
    </Tabs>
  );
}
