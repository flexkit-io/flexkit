import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../auth/auth-context';
import { ConfigProvider } from '../../core/config/config-context';
import type { ProjectOptions } from '../../core/config/types';

export function Root({ config }: { config: ProjectOptions[] }): JSX.Element {
  // TODO: config must come via prop from flexkit-studio.tsx
  const configTmp = {
    basePath: '/studio',
    projectId: 'abcdefghij',
  };
  const location = useLocation();
  const currentPathname = location.pathname;

  if (currentPathname === configTmp.basePath) {
    window.location.href = `${configTmp.basePath}/${configTmp.projectId}`;
  }

  return (
    <AuthProvider>
      <ConfigProvider config={config}>
        <Outlet />
      </ConfigProvider>
    </AuthProvider>
  );
}
