import { Outlet, useLocation } from 'react-router-dom';

export function Root(): JSX.Element {
  // TODO: config must come via prop from flexkit-studio.tsx
  const config = {
    basePath: '/studio',
    projectId: 'abcdefghij',
  };
  const location = useLocation();
  const currentPathname = location.pathname;

  if (currentPathname === config.basePath) {
    window.location.href = `${config.basePath}/${config.projectId}`;
  }

  return <Outlet />;
}
