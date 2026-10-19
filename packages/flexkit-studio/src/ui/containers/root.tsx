import type { JSX } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { AuthProvider } from '../../auth/auth-context';
import { Login } from '../../auth/login';
import { ConfigProvider } from '../../core/config/config-context';
import { DesktopEffects } from '../../core/desktop-effects';
import { pickStartProjectId, readLastProjectId } from '../../core/config/last-project';
import type { ProjectSummary, StudioMode } from '../../core/config/types';
import { useHostedSession } from '../../core/config/use-hosted-session';
import { GraphQLProvider } from '../../graphql-client/graphql-context';
import { ActionsManager } from '../../entities/actions-manager';
import { Loading } from '../components/loading';
import { NoProjects } from '../components/no-projects';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert';
import { Button } from '../primitives/button';
import { DrawerModalProvider } from '../drawer-modal-context';

const NavigateCompat = Navigate as unknown as React.ComponentType<{ replace?: boolean; to: string }>;

function Providers({
  mode,
  projectIds,
  projectSummaries,
  userId,
}: {
  mode: StudioMode;
  projectIds: string[];
  projectSummaries?: ProjectSummary[];
  userId?: string;
}): JSX.Element {
  return (
    <AuthProvider mode={mode}>
      <ConfigProvider mode={mode} projectIds={projectIds} projectSummaries={projectSummaries} userId={userId}>
        <GraphQLProvider>
          <DrawerModalProvider>
            <ActionsManager />
          </DrawerModalProvider>
          <Outlet />
        </GraphQLProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}

/** Project mode: the host listed the projects; `/` opens the first one. */
function ProjectsRoot({ projectIds }: { projectIds: string[] }): JSX.Element {
  const location = useLocation();
  const [defaultProjectId] = projectIds;

  if (location.pathname === '/' && defaultProjectId) {
    return <NavigateCompat replace to={`/${defaultProjectId}`} />;
  }

  return <Providers mode="projects" projectIds={projectIds} />;
}

function SessionUnavailable({ message }: { message: string }): JSX.Element {
  return (
    <div className="fk:flex fk:h-full fk:min-h-screen fk:items-center fk:justify-center fk:p-8 fk:bg-background">
      <Alert className="fk:max-w-lg" variant="destructive">
        <AlertCircle className="fk:h-4 fk:w-4" />
        <AlertTitle>Could not load your projects</AlertTitle>
        <AlertDescription className="fk:flex fk:flex-col fk:gap-3">
          <span>{message}</span>
          <Button
            className="fk:self-start"
            onClick={() => {
              window.location.reload();
            }}
            size="sm"
            variant="outline"
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Hosted mode: sign in once, then open any project the account can access.
 * `/` goes to the project used last on this browser, or the first one.
 */
function HostedRoot(): JSX.Element {
  const session = useHostedSession();
  const location = useLocation();

  if (session.status === 'loading') {
    return <Loading />;
  }

  if (session.status === 'anonymous') {
    return <Login />;
  }

  if (session.status === 'error') {
    return <SessionUnavailable message={session.message} />;
  }

  const projectIds = session.projects.map((project) => project.id);

  if (projectIds.length === 0) {
    return <NoProjects user={session.user} />;
  }

  if (location.pathname === '/') {
    const startProjectId = pickStartProjectId(projectIds, readLastProjectId());

    return <NavigateCompat replace to={`/${startProjectId ?? ''}`} />;
  }

  return <Providers mode="hosted" projectIds={projectIds} projectSummaries={session.projects} userId={session.user.id} />;
}

export function Root({ projectIds }: { projectIds?: string[] }): JSX.Element {
  return (
    <>
      <DesktopEffects />
      {projectIds === undefined ? <HostedRoot /> : <ProjectsRoot projectIds={projectIds} />}
    </>
  );
}
