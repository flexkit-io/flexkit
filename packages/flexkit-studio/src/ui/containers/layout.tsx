import { Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/auth-context';
import { Login } from '../../auth/login';
import { useConfig } from '../../core/config/config-context';
import { Loading } from '../components/loading';
import { Toaster } from '../primitives/sonner';
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
    <>
      {/* eslint-disable-next-line react/no-unknown-property -- vaul-drawer-wrapper custom property required by Vaul component */}
      <div className="fk-flex fk-flex-col fk-h-full" vaul-drawer-wrapper="">
        <Navbar projectId={projectId ?? ''} projects={projects} />
        <div className="fk-flex fk-h-full fk-max-h-[calc(100%-3.5rem)] fk-border-t fk-border-border fk-grow shrink">
          <AppBar apps={apps} version={version} />
          <Outlet />
        </div>
      </div>
      <Toaster />
    </>
  );
}
