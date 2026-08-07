import { JSX } from 'react';
import { find, propEq } from 'ramda';
import { filterEntitiesForSpaces, Outlet, useAuth, useConfig } from '@flexkit/studio';
import { Sidebar, SidebarInset, SidebarProvider } from '@flexkit/studio/ui';
import type { SingleProject } from '@flexkit/studio';

const SIDEBAR_COOKIE_NAME = 'flexkit:sidebar:state';

export function Root(): JSX.Element {
  const [, auth] = useAuth();
  const { projects, currentProjectId } = useConfig();
  const { schema, menuGroups } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  // Space-bound entities are hidden from non-members; the generated
  // @authorization rules block their data server-side either way.
  const visibleSchema = filterEntitiesForSpaces(schema, auth.user?.spaces);
  const defaultOpen =
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
      ?.split('=')[1] !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar schema={visibleSchema} menuGroups={menuGroups} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
