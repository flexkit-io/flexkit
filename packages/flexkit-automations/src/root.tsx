import type { JSX } from 'react';
import { Outlet, useConfig } from '@flexkit/studio';
import { SidebarInset, SidebarProvider } from '@flexkit/studio/ui';
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
      <SidebarInset className="fk:min-w-0">
        <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:overflow-hidden fk:px-4 fk:pt-3">
          <div className="fk:flex fk:min-h-0 fk:min-w-0 fk:flex-1 fk:flex-col">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
