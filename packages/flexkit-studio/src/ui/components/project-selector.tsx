import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import type { ProjectUiConfig } from '../../core/config/types';

type Props = {
  projectId: string;
  /** Every project the host passed, loaded or not. */
  projectIds: string[];
  /** Projects whose schema has loaded; used for titles. */
  projects: ProjectUiConfig[];
};

/** Title of a project, or its id until the schema has loaded. */
export function getProjectLabel(projectId: string, projects: ProjectUiConfig[]): string {
  return projects.find((project) => project.projectId === projectId)?.title ?? projectId;
}

export function ProjectSelector({ projectId, projectIds, projects }: Props): JSX.Element {
  const navigate = useNavigate();
  const label = getProjectLabel(projectId, projects);

  return (
    <Select
      onValueChange={(id) => {
        navigate(`/${id}`);
      }}
      value={projectId}
    >
      <SelectTrigger className="fk:w-48! fk:h-9 fk:py-1" id="project">
        <SelectValue aria-label={label}>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {projectIds.map((id) => (
          <SelectItem key={id} value={id}>
            {getProjectLabel(id, projects)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
