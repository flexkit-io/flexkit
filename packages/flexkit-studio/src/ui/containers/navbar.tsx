import { useNavigate } from 'react-router-dom';
import { Suspense, lazy, startTransition } from 'react';
import type { JSX } from 'react';
import { useTheme } from '../theme-context';
import type { ProjectSummary, ProjectUiConfig } from '../../core/config/types';

const Logo = lazy(() => import('../components/logo.js').then(({ Logo: Component }) => ({ 'default': Component })));
const ProjectSelector = lazy(() =>
  import('../components/project-selector.js').then(({ ProjectSelector: Component }) => ({ 'default': Component }))
);
const Search = lazy(() => import('../components/search.js').then(({ Search: Component }) => ({ 'default': Component })));
const ActivityNavButton = lazy(() =>
  import('../../apps/ai/activity-nav-button.js').then(({ ActivityNavButton: Component }) => ({ 'default': Component }))
);
const UserNav = lazy(() => import('../components/user-nav.js').then(({ UserNav: Component }) => ({ 'default': Component })));

type Props = {
  projectId: string;
  projectIds: string[];
  /** Hosted mode: names and teams known before schemas load. */
  projectSummaries?: ProjectSummary[];
  projects: ProjectUiConfig[];
};

export function Navbar({ projectId, projectIds, projectSummaries = [], projects }: Props): JSX.Element {
  const { resolvedTheme } = useTheme();
  const currentProject = projects.find((project) => project.projectId === projectId);
  const currentSummary = projectSummaries.find((project) => project.id === projectId);
  const schema = currentProject?.schema ?? [];
  const navigate = useNavigate();

  function handleSearchSelection(item: { entityName: string; entityNamePlural: string; entityId: string }) {
    startTransition(() => {
      navigate(`/${projectId}/desk/list/${item.entityNamePlural}?id=${item.entityId}`);
    });
  }

  return (
    <div className="fk:flex fk:basis-14 fk:min-h-14 fk:px-3 fk:gap-x-4 fk:border-b fk:border-border fk:z-30">
      <Suspense fallback={null}>
        <Logo theme={resolvedTheme} title={currentProject?.title ?? currentSummary?.name ?? 'Flexkit Studio'} />
      </Suspense>
      <div className="fk:flex fk:grow fk:shrink fk:items-center fk:gap-x-4 px-4">
        <Suspense fallback={null}>
          <ProjectSelector
            projectId={projectId}
            projectIds={projectIds}
            projectSummaries={projectSummaries}
            projects={projects}
          />
        </Suspense>
        <Suspense fallback={null}>
          <Search key={projectId} onSelect={handleSearchSelection} projectId={projectId} schema={schema} />
        </Suspense>
      </div>
      <div className="fk:flex fk:items-center fk:gap-x-4">
        <Suspense fallback={null}>
          <ActivityNavButton projectId={projectId} />
        </Suspense>
        <Suspense fallback={null}>
          <UserNav projectId={projectId} />
        </Suspense>
      </div>
    </div>
  );
}
