import { JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { filterEntitiesForSpaces } from '../../core/spaces';
import { useAuth } from '../../auth/auth-context';
import { useConfig } from '../../core/config/config-context';
import { Sidebar, SidebarInset, SidebarProvider } from '../../ui';

const SIDEBAR_COOKIE_NAME = 'flexkit:sidebar:state';

export function Root(): JSX.Element {
  const [, auth] = useAuth();
  const { currentProject } = useConfig();
  const schema = currentProject?.schema ?? [];
  const menuGroups = currentProject?.menuGroups ?? [];
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
