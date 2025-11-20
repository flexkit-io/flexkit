import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import type { ProjectOptions } from '../../core/config/types';

type Props = {
  projectId: string;
  projects: ProjectOptions[];
};

export function ProjectSelector({ projectId, projects }: Props): JSX.Element {
  const [selectedProject, setSelectedProject] = useState(
    projects.find((project) => project.projectId === projectId) ?? projects[0]
  );
  const navigate = useNavigate();

  return (
    <Select
      defaultValue={selectedProject.projectId}
      onValueChange={(id) => {
        const currentProject = projects.find((project) => project.projectId === id) ?? projects[0];
        const { basePath } = currentProject;

        setSelectedProject(currentProject);
        navigate(`${basePath}/${currentProject.projectId}`);
      }}
    >
      <SelectTrigger className="fk-w-[12rem] fk-h-9 fk-py-1" id="project">
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
  );
}
