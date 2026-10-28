import { useEffect, type JSX } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/auth-context';
import { Login } from '../../auth/login';
import { useConfig } from '../../core/config/config-context';
import { SCOPE_STORAGE_KEY, useAppDispatch } from '../../core/app-context';
import { rememberLastProjectId } from '../../core/config/last-project';
import type { ProjectSchemaError } from '../../core/config/types';
import { FlexkitError } from '../../core/error/errors';
import { setErrorReportingProjectId } from '../../core/error/error-reporter';
import { ActivityNotifier } from '../../apps/ai/activity-notifier';
import { Loading } from '../components/loading';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert';
import { Toaster } from '../primitives/sonner';
import { AppBar } from './appbar';
import { AppOutlet, useAppSessions } from './app-outlet';
import { Navbar } from './navbar';
import { useStudioVersion } from '../../core/use-studio-version';


function SchemaUnavailable({
  projectId,
  error,
  showHomeLink = false,
}: {
  projectId: string;
  error: ProjectSchemaError;
  /** Hosted mode: offer a way back to the projects the account can open. */
  showHomeLink?: boolean;
}): JSX.Element {
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
        <AlertDescription className="fk:flex fk:flex-col fk:gap-2">
          <span>{description}</span>
          {showHomeLink ? (
            <Link className="fk:underline fk:underline-offset-4" to="/">
              Back to your projects
            </Link>
          ) : null}
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function Layout(): JSX.Element {
  const { apps, currentProject, isLoadingSchemas, mode, projectIds, projects, projectSummaries, schemaErrors } =
    useConfig();
  const [isLoading, auth] = useAuth();
  const { projectId = '' } = useParams();
  const scopes = currentProject?.scopes;
  const appDispatch = useAppDispatch();
  const location = useLocation();
  const isKnownProject = projectIds.includes(projectId);
  const appSessions = useAppSessions(apps, projectId);
  const version = useStudioVersion();

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

  // Error reports name the project the user is in. Set while rendering (it is
  // idempotent), so it is current before any child of this commit can fail;
  // effects and componentDidCatch of children run before this component's effects.
  setErrorReportingProjectId(isKnownProject ? projectId : null);
  useEffect(() => () => setErrorReportingProjectId(null), []);

  // Hosted mode: come back to the project the user worked in last.
  useEffect(() => {
    if (mode === 'hosted' && isKnownProject && currentProject) {
      rememberLastProjectId(projectId);
    }
  }, [currentProject, isKnownProject, mode, projectId]);

  if (!isKnownProject) {
    if (mode === 'projects') {
      throw new FlexkitError('PROJECT_NOT_FOUND');
    }

    return (
      <SchemaUnavailable error={{ status: 403, message: 'No access to this project' }} projectId={projectId} showHomeLink />
    );
  }

  if (isLoading) {
    return <Loading />;
  }

  if (!auth.user?.id) {
    return <Login projectId={mode === 'hosted' ? undefined : projectId} />;
  }

  if (isLoadingSchemas) {
    return <Loading />;
  }

  const schemaError = schemaErrors[projectId];

  return (
    <>
      {/* eslint-disable-next-line react/no-unknown-property -- vaul-drawer-wrapper custom property required by Vaul component */}
      <div className="fk:flex fk:flex-col fk:h-full flexkit-studio" vaul-drawer-wrapper="">
        <Navbar projectId={projectId} projectIds={projectIds} projectSummaries={projectSummaries} projects={projects} />
        <div className="fk:flex fk:h-full fk:max-h-[calc(100%-3.5rem)] fk:border-t fk:border-border fk:grow shrink">
          <AppBar apps={apps} version={version} {...appSessions} />
          {currentProject ? (
            <AppOutlet apps={apps} {...appSessions} />
          ) : (
            <SchemaUnavailable
              error={schemaError ?? { status: 0, message: 'The project schema is not available.' }}
              projectId={projectId}
              showHomeLink={mode === 'hosted'}
            />
          )}
        </div>
      </div>
      <ActivityNotifier projectId={projectId} />
      <Toaster />
    </>
  );
}
