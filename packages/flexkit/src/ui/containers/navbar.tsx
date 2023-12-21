import { useState } from 'react';
import { Logo } from '../components/logo';
import { UserNav } from '../components/user-nav';
import { Search } from '../components/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import type { ProjectOptions } from '../../core/config/types';

type Props = {
  projectId: string;
  projects: ProjectOptions[];
};

export function Navbar({ projectId, projects }: Props): JSX.Element {
  const [selectedProject, setSelectedProject] = useState(
    projects.find((project) => project.projectId === projectId) ?? projects[0]
  );

  return (
    <div className="flex basis-14 min-h-[3.5rem] px-3 border-b">
      <Logo />
      <div className="flex grow shrink items-center gap-x-4 px-4">
        <Select
          defaultValue={selectedProject.projectId}
          onValueChange={(id) => {
            setSelectedProject(projects.find((project) => project.projectId === id) ?? projects[0]);
          }}
        >
          <SelectTrigger className="w-[12rem] h-9 py-1" id="project">
            <SelectValue aria-label={selectedProject.title}>{selectedProject.title}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.projectId} value={project.projectId}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Search />
      </div>
      <div className="flex items-center">
        <UserNav />
      </div>
    </div>
  );
}
