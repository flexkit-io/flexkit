import type { JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { useConfig } from '../../core/config/config-context';
import { SidebarInset, SidebarProvider } from '../../ui';
import { KnowledgeSidebar } from './sidebar';

const SIDEBAR_COOKIE_NAME = 'flexkit:sidebar:state';

/**
 * The Knowledge library: documents the team adds so people can read them and
 * the agent can search and cite them. The sidebar filters the list; the list
 * and the document pages render in the inset.
 */
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
        Select a project to manage its knowledge.
      </main>
    );
  }

  return (
    <SidebarProvider className="fk:h-full" defaultOpen={defaultOpen}>
      <KnowledgeSidebar />
      <SidebarInset className="fk:min-w-0">
        <div className="fk:flex fk:h-full fk:min-h-0 fk:min-w-0 fk:flex-col fk:overflow-hidden fk:pl-4 fk:pt-3">
          <div className="fk:flex fk:min-h-0 fk:min-w-0 fk:flex-1 fk:flex-col">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
