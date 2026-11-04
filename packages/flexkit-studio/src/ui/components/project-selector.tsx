import { useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useConfig } from '../../core/config/config-context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../primitives/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../primitives/select';
import type { ProjectSummary, ProjectUiConfig } from '../../core/config/types';
import { NewProjectFlow } from './new-project-flow';
import { getProjectLabel, groupProjectIdsByTeam } from './project-label';

/** Select value of the "New project" entry; project ids are ten lowercase characters, so it cannot collide. */
const NEW_PROJECT_VALUE = '__new_project__';

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
  const { mode, teams } = useConfig();
  const [isCreating, setIsCreating] = useState(false);
  const label = getProjectLabel(projectId, projects, projectSummaries);
  const groups = groupProjectIdsByTeam(projectIds, projectSummaries);
  // Projects are created from the hosted Studio only; a self-hosted Studio lists fixed project ids.
  const canCreate = mode === 'hosted';

  return (
    <>
      <Select
        onValueChange={(id) => {
          if (id === NEW_PROJECT_VALUE) {
            setIsCreating(true);

            return;
          }

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
          {canCreate ? (
            <>
              <SelectSeparator />
              <SelectItem value={NEW_PROJECT_VALUE}>
                <Plus className="fk:h-4 fk:w-4" />
                New project
              </SelectItem>
            </>
          ) : null}
        </SelectContent>
      </Select>
      {canCreate ? (
        <Dialog onOpenChange={setIsCreating} open={isCreating}>
          <DialogContent className="fk:sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>
                Projects start on the Free plan. Start from the commerce starter, or let the AI agent design the schema
                with you.
              </DialogDescription>
            </DialogHeader>
            {isCreating ? (
              <NewProjectFlow
                onCancel={() => {
                  setIsCreating(false);
                }}
                onCreated={() => {
                  setIsCreating(false);
                }}
                teams={teams}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
