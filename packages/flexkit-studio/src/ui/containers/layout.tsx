import { useEffect, type JSX } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/auth-context';
import { Login } from '../../auth/login';
import { useConfig } from '../../core/config/config-context';
import { SCOPE_STORAGE_KEY, useAppDispatch } from '../../core/app-context';
import type { ProjectSchemaError } from '../../core/config/types';
import { FlexkitError } from '../../core/error/errors';
import { ToolsDevConnectTick } from '../../tools/dev-connect-tick';
import { Loading } from '../components/loading';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert';
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

function SchemaUnavailable({ projectId, error }: { projectId: string; error: ProjectSchemaError }): JSX.Element {
  const isMissing = error.status === 404;
  const isForbidden = error.status === 401 || error.status === 403;
  const title = isMissing
    ? 'No deployed schema'
    : isForbidden
      ? 'No access to this project'
      : 'Could not load the project schema';
  const description = isMissing
    ? `Project "${projectId}" has no deployed schema yet. Run \`flexkit deploy\` from the folder containing its flexkit.config.ts.`
    : isForbidden
      ? `Your account is not a member of project "${projectId}". Ask a project owner to invite you.`
      : `${error.message} (project "${projectId}").`;

  return (
    <div className="fk:flex fk:h-full fk:items-center fk:justify-center fk:p-8">
      <Alert className="fk:max-w-lg" variant="destructive">
        <AlertCircle className="fk:h-4 fk:w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </div>
  );
}

export function Layout({ version }: Props): JSX.Element {
  const { apps, currentProject, isLoadingSchemas, projectIds, projects, schemaErrors } = useConfig();
  const [isLoading, auth] = useAuth();
  const { projectId = '' } = useParams();
  const scopes = currentProject?.scopes;
  const appDispatch = useAppDispatch();
  const location = useLocation();

  if (!projectIds.includes(projectId)) {
    throw new FlexkitError('PROJECT_NOT_FOUND');
  }

  useEffect(() => {
    if (scopes && scopes.length > 0) {
      const defaultScope = scopes.find((s) => s.isDefault) ?? scopes[0];
      let savedScope = '';

      if (typeof localStorage !== 'undefined') {
        savedScope = localStorage.getItem(`${SCOPE_STORAGE_KEY}${projectId}`) ?? '';
      }

      appDispatch({ type: 'setScope', payload: { projectId, scope: savedScope || defaultScope.name } });
    }
  }, [appDispatch, location, projectId, scopes]);

  if (isLoading) {
    return <Loading />;
  }

  if (!auth.user?.id) {
    return <Login projectId={projectId} />;
  }

  if (isLoadingSchemas) {
    return <Loading />;
  }

  const schemaError = schemaErrors[projectId];

  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property -- vaul-drawer-wrapper custom property required by Vaul component */}
      <div className="fk:flex fk:flex-col fk:h-full flexkit-studio" vaul-drawer-wrapper="">
        <Navbar projectId={projectId} projectIds={projectIds} projects={projects} />
        <div className="fk:flex fk:h-full fk:max-h-[calc(100%-3.5rem)] fk:border-t fk:border-border fk:grow shrink">
          <AppBar apps={apps} version={version} />
          {currentProject ? (
            <Outlet />
          ) : (
            <SchemaUnavailable
              error={schemaError ?? { status: 0, message: 'The project schema is not available.' }}
              projectId={projectId}
            />
          )}
        </div>
      </div>
      <Toaster />
      <ToolsDevConnectTick projectId={projectId} role={auth.user.role} />
    </>
  );
}
