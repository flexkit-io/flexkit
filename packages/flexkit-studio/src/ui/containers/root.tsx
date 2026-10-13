import type { JSX } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../auth/auth-context';
import { ConfigProvider } from '../../core/config/config-context';
import { GraphQLProvider } from '../../graphql-client/graphql-context';
import { ActionsManager } from '../../entities/actions-manager';
import { DrawerModalProvider } from '../drawer-modal-context';

const NavigateCompat = Navigate as unknown as React.ComponentType<{ replace?: boolean; to: string }>;

export function Root({ projectIds }: { projectIds: string[] }): JSX.Element {
  const location = useLocation();
  const [defaultProjectId] = projectIds;

  // `/` (relative to the router basename) opens the first project.
  if (location.pathname === '/' && defaultProjectId) {
    return <NavigateCompat replace to={`/${defaultProjectId}`} />;
  }

  return (
    <AuthProvider>
      <ConfigProvider projectIds={projectIds}>
        <GraphQLProvider>
          <DrawerModalProvider>
            <ActionsManager />
          </DrawerModalProvider>
          <Outlet />
        </GraphQLProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}
