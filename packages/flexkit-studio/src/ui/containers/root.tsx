import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../auth/auth-context';
import { ConfigProvider } from '../../core/config/config-context';
import type { ProjectOptions } from '../../core/config/types';

export function Root({ config }: { config: ProjectOptions[] }): JSX.Element {
  const [defaultApp] = config;
  const { basePath, projectId } = defaultApp;
  const location = useLocation();
  const currentPathname = location.pathname;

  if (currentPathname === basePath) {
    window.location.href = `${basePath}/${projectId}`;
  }

  return (
    <AuthProvider>
      <ConfigProvider config={config}>
        <Outlet />
      </ConfigProvider>
    </AuthProvider>
  );
}
