import { useNavigate } from 'react-router-dom';
import { Suspense, startTransition } from 'react';
import { useTheme } from 'next-themes';
import type { ProjectOptions } from '../../core/config/types';
import { useContributedComponent } from '../../core/use-contributed-component';

type Props = {
  projectId: string;
  projects: ProjectOptions[];
};

export function Navbar({ projectId, projects }: Props): JSX.Element {
  const { resolvedTheme } = useTheme();
  const Logo = useContributedComponent('navbar.logo');
  const ProjectSelector = useContributedComponent('navbar.projectSelector');
  const Search = useContributedComponent('navbar.search');
  const UserNav = useContributedComponent('navbar.userNav');
  const currentProject = projects.find((project) => project.projectId === projectId) ?? projects[0];
  const { basePath, schema } = currentProject;
  const navigate = useNavigate();

  function handleSearchSelection(item: { entityName: string; entityNamePlural: string; entityId: string }) {
    startTransition(() => {
      navigate(`${basePath}/${projectId}/desk/list/${item.entityNamePlural}?id=${item.entityId}`);
    });
  }

  return (
    <div className="fk-flex fk-basis-14 fk-min-h-[3.5rem] fk-px-3 fk-gap-x-4 fk-border-b fk-border-border fk-z-20">
      <Suspense fallback={null}>
        <Logo theme={resolvedTheme} title="Flexkit Studio" />
      </Suspense>
      <div className="fk-flex fk-grow fk-shrink fk-items-center fk-gap-x-4 px-4">
        <Suspense fallback={null}>
          <ProjectSelector projectId={projectId} projects={projects} />
        </Suspense>
        <Suspense fallback={null}>
          <Search onSelect={handleSearchSelection} projectId={projectId} schema={schema} />
        </Suspense>
      </div>
      <div className="fk-flex fk-items-center">
        <Suspense fallback={null}>
          <UserNav projectId={projectId} />
        </Suspense>
      </div>
    </div>
  );
}
