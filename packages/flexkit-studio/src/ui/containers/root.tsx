import { Outlet } from 'react-router-dom';
import { AuthProvider } from '../../auth/auth-context';
import { ConfigProvider } from '../../core/config/config-context';
import { GraphQLProvider } from '../../graphql-client/graphql-context';
import type { ProjectOptions } from '../../core/config/types';

export function Root({ config }: { config: ProjectOptions[] }): JSX.Element {
  const [defaultApp] = config;
  const { basePath, projectId } = defaultApp;

  if (window.location.pathname === basePath) {
    window.location.href = `${basePath}/${projectId}`;
  }

  return (
    <AuthProvider>
      <ConfigProvider config={config}>
        <GraphQLProvider>
          <Outlet />
        </GraphQLProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}
