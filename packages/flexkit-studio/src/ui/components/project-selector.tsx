import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../primitives/select';
import type { ProjectSummary, ProjectUiConfig } from '../../core/config/types';
import { getProjectLabel, groupProjectIdsByTeam } from './project-label';

export { getProjectLabel } from './project-label';

type Props = {
  projectId: string;
  /** Every project the Studio can open, loaded or not. */
  projectIds: string[];
  /** Hosted mode: names and teams known before any schema loads. */
  projectSummaries?: ProjectSummary[];
  /** Projects whose schema has loaded; used for titles. */
  projects: ProjectUiConfig[];
};

export function ProjectSelector({ projectId, projectIds, projectSummaries = [], projects }: Props): JSX.Element {
  const navigate = useNavigate();
  const label = getProjectLabel(projectId, projects, projectSummaries);
  const groups = groupProjectIdsByTeam(projectIds, projectSummaries);

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
        {groups.map((group, index) => (
          <SelectGroup key={group.label ?? index}>
            {group.label ? <SelectLabel>{group.label}</SelectLabel> : null}
            {group.projectIds.map((id) => (
              <SelectItem key={id} value={id}>
                {getProjectLabel(id, projects, projectSummaries)}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
