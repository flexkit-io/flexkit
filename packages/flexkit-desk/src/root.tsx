import { find, propEq } from 'ramda';
import { Outlet, useAuth, useConfig } from '@flexkit/studio';
import { Sidebar, SidebarInset, SidebarProvider } from '@flexkit/studio/ui';
import type { SingleProject } from '@flexkit/studio';

const SIDEBAR_COOKIE_NAME = 'flexkit:sidebar:state';

export function Root(): JSX.Element {
  const [, auth] = useAuth();
  const { projects, currentProjectId } = useConfig();
  const { schema, menuGroups } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const defaultOpen =
    document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
      ?.split('=')[1] !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar schema={schema} menuGroups={menuGroups} />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
