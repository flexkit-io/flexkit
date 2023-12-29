import { Outlet, useParams } from 'react-router-dom';
import useSWR from 'swr';
import type { Fetcher } from 'swr';
import { useAuth } from '../../auth/auth-context';
import { Login } from '../../auth/login';
import { apiPaths } from '../../core/api-paths';
import { useConfig } from '../../core/config/config-context';
import { Loading } from '../components/loading';
import { AppBar } from './appbar';
import { Navbar } from './navbar';

type Props = {
  version: {
    current: string;
    latest: string;
    isCurrent: boolean;
  };
};

const fetcher = (url: string): Promise<Fetcher> =>
  fetch(url, { mode: 'cors' }).then((res) => res.json() as Promise<Fetcher>);

export function Layout({ version }: Props): JSX.Element {
  const { contributions, projects } = useConfig();
  const [isLoading, auth] = useAuth();
  const { projectId } = useParams();
  const { apps } = contributions;
  const {
    data: schema,
    isLoading: isLoadingSchema,
    error,
  } = useSWR(() => (auth.user?.id ? apiPaths(projectId ?? '').schema : null), fetcher);

  if (isLoading || isLoadingSchema) {
    return <Loading />;
  }

  if (!auth.user?.id) {
    return <Login projectId={projectId ?? ''} />;
  }

  if (error) {
    throw new Error('Not found');
  }

  return (
    <div className="fk-flex fk-flex-col fk-h-full">
      <Navbar projectId={projectId ?? ''} projects={projects} />
      <div className="fk-flex fk-h-full fk-max-h-[calc(100%-3.5rem)] fk-border-t fk-border-border fk-grow shrink">
        <AppBar apps={apps} version={version} />
        <div className="fk-w-full focus-visible:fk-outline-none focus-visible:fk-ring-0 focus-visible:fk-ring-offset-0 fk-overflow-x-hidden fk-overflow-y-auto">
          {JSON.stringify(schema)}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
