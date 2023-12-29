import type { ProjectOptions } from '../../core/config/types';
import { useMiddlewareComponent } from '../../core/use-middleware-component';

type Props = {
  projectId: string;
  projects: ProjectOptions[];
};

export function Navbar({ projectId, projects }: Props): JSX.Element {
  const Logo = useMiddlewareComponent({ contributionPoint: 'navbar.logo' });
  const ProjectSelector = useMiddlewareComponent({ contributionPoint: 'navbar.projectSelector' });
  const Search = useMiddlewareComponent({ contributionPoint: 'navbar.search' });
  const UserNav = useMiddlewareComponent({ contributionPoint: 'navbar.userNav' });

  return (
    <div className="fk-flex fk-basis-14 fk-min-h-[3.5rem] fk-px-3 fk-gap-x-4 fk-border-b fk-border-border">
      <Logo title="Flexkit Studio" />
      <div className="fk-flex fk-grow fk-shrink fk-items-center fk-gap-x-4 px-4">
        <ProjectSelector projectId={projectId} projects={projects} />
        <Search />
      </div>
      <div className="fk-flex fk-items-center">
        <UserNav projectId={projectId} />
      </div>
    </div>
  );
}
