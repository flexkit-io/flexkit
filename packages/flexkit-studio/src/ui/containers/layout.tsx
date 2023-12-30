import { Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { Login } from '../../auth/login';
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

export function Layout({ version }: Props): JSX.Element {
  const { contributions, projects } = useConfig();
  const [isLoading, auth] = useAuth();
  const { projectId } = useParams();
  const { apps } = contributions;

  if (isLoading) {
    return <Loading />;
  }

  if (!auth.user?.id) {
    return <Login projectId={projectId ?? ''} />;
  }

  return (
    <div className="fk-flex fk-flex-col fk-h-full">
      <Navbar projectId={projectId ?? ''} projects={projects} />
      <div className="fk-flex fk-h-full fk-max-h-[calc(100%-3.5rem)] fk-border-t fk-border-border fk-grow shrink">
        <AppBar apps={apps} version={version} />
        <div className="fk-w-full focus-visible:fk-outline-none focus-visible:fk-ring-0 focus-visible:fk-ring-offset-0 fk-overflow-x-hidden fk-overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
