import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
// import useSWR from 'swr';
import { useAuth } from '../../auth/auth-context';
import { useConfig } from '../../core/config/config-context';
import { Loading } from '../components/loading';
import { AppBar } from './app-bar';
import { Navbar } from './navbar';

type Props = {
  version: {
    current: string;
    latest: string;
    isCurrent: boolean;
  };
};

export function Layout({ version }: Props): JSX.Element {
  const { contributions, projects } = useConfig();
  const location = useLocation();
  const [isLoading, auth] = useAuth();
  const { projectId } = useParams();
  const { apps } = contributions;
  // const { data: schema, isLoading: isLoadingSchema } = useSWR(() => (user ? apiPaths['schema'] : null), fetcher);

  if (isLoading) {
    return <Loading />;
  }

  if (!auth.user?.id) {
    return <Navigate replace state={{ from: location }} to="/studio/login" />;
  }

  return (
    <div className="flex flex-col h-full">
      <Navbar projectId={projectId ?? ''} projects={projects} />
      <div className="flex h-full border-t grow shrink">
        <AppBar apps={apps} version={version} />
        <div className="w-full focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
