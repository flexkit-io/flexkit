import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../../auth/auth-context';
import { ConfigProvider } from '../../core/config/config-context';
import { GraphQLProvider } from '../../graphql-client/graphql-context';
import { ActionsManager } from '../../entities/actions-manager';
import type { ProjectOptions } from '../../core/config/types';
import { joinBasePath, normalizeBasePath } from '../../core/base-path';
import { DrawerModalProvider } from '../drawer-modal-context';

export function Root({ config }: { config: ProjectOptions[] }): JSX.Element {
  const [defaultApp] = config;
  const { basePath, projectId } = defaultApp;
  const normalizedBasePath = normalizeBasePath(basePath);

  if (window.location.pathname === normalizedBasePath) {
    window.location.href = joinBasePath(normalizedBasePath, projectId);
  }

  return (
    <AuthProvider>
      <ConfigProvider config={config}>
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
