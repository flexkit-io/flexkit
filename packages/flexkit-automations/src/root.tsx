import type { JSX } from 'react';
import { Outlet, useConfig } from '@flexkit/studio';
import {
  Separator,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@flexkit/studio/ui';
import { AutomationsSidebar } from './sidebar';

const SIDEBAR_COOKIE_NAME = 'flexkit:sidebar:state';

export function Root(): JSX.Element {
  const { currentProjectId } = useConfig();
  const defaultOpen =
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
      ?.split('=')[1] !== 'false';

  if (!currentProjectId) {
    return (
      <main className="fk:flex fk:h-full fk:flex-1 fk:items-center fk:justify-center fk:p-8 fk:text-sm fk:text-muted-foreground">
        Select a project to manage automations.
      </main>
    );
  }

  return (
    <SidebarProvider className="fk:h-full" defaultOpen={defaultOpen}>
      <AutomationsSidebar />
      <SidebarInset>
        <div className="fk:flex fk:h-full fk:min-h-0 fk:flex-col fk:overflow-hidden fk:px-4 fk:pt-3">
          {/* <div className="fk:mb-4 fk:flex fk:shrink-0 fk:items-start fk:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="fk:-ml-1 fk:h-4 fk:w-4" />
              </TooltipTrigger>
              <TooltipContent>Toggle Sidebar</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="fk:mt-1 fk:h-4" />
            <div>
              <h1 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">Automations</h1>
              <p className="fk:mt-1 fk:text-sm fk:text-muted-foreground">
                Agent-powered tasks that run on a schedule or when your data changes.
              </p>
            </div>
          </div> */}
          <div className="fk:flex fk:min-h-0 fk:flex-1 fk:flex-col">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
