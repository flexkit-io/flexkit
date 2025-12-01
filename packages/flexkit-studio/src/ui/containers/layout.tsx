import { useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { find, propEq } from 'ramda';
import { useAuth } from '../../auth/auth-context';
import { Login } from '../../auth/login';
import { useConfig } from '../../core/config/config-context';
import { SCOPE_STORAGE_KEY, useAppDispatch } from '../../core/app-context';
import type { SingleProject } from '../../core/config/types';
import { FlexkitError } from '../../core/error/errors';
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

  const project = find(propEq(projectId ?? '', 'projectId'))(projects) as SingleProject | undefined;

  if (!project) {
    throw new FlexkitError('PROJECT_NOT_FOUND');
  }

  const { scopes } = project;
  const { apps } = contributions;
  const appDispatch = useAppDispatch();
  const location = useLocation();

  useEffect(() => {
    if (scopes) {
      const defaultScope = scopes.find((s) => s.isDefault) || scopes[0];
      let savedScope = '';

      if (typeof localStorage !== 'undefined') {
        savedScope = localStorage.getItem(`${SCOPE_STORAGE_KEY}${projectId}`) ?? '';
      }

      appDispatch({ type: 'setScope', payload: { projectId, scope: savedScope || defaultScope.name } });
    }
  }, [location]);

  if (isLoading) {
    return <Loading />;
  }

  if (!auth.user?.id) {
    return <Login projectId={projectId ?? ''} />;
  }

  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property -- vaul-drawer-wrapper custom property required by Vaul component */}
      <div className="fk-flex fk-flex-col fk-h-full flexkit-studio" vaul-drawer-wrapper="">
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
