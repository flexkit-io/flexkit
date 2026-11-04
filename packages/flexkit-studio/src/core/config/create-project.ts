import { userApiPaths } from '../api-paths';
import { send } from './onboarding';
import type { HostedTeam } from './types';

/** What `POST /api/me/projects` answers: the new project and the team it went to (possibly a new personal team). */
export type CreatedProject = { project: { id: string; name: string }; team: { id: string; name: string } };

export type CreateProjectOutcome = ({ ok: true } & CreatedProject) | { ok: false; code: string; message: string };

const FALLBACK_MESSAGE = 'Could not create the project. Please try again.';

/** Hosted mode: creates a project for the signed-in user (Free plan, user as owner). */
export async function createHostedProject(input: { name: string; teamId?: string }): Promise<CreateProjectOutcome> {
  const outcome = await send<Partial<CreatedProject>>(userApiPaths.myProjects, 'POST', input, FALLBACK_MESSAGE);

  if (!outcome.ok) {
    return outcome;
  }

  if (!outcome.project?.id || !outcome.team?.id) {
    return { ok: false, code: 'unknown_error', message: FALLBACK_MESSAGE };
  }

  return { ok: true, project: outcome.project, team: outcome.team };
}

/** Teams the user may create projects in, in the order `/api/me` lists them (oldest first). */
export function ownedTeams(teams: HostedTeam[]): HostedTeam[] {
  return teams.filter((team) => team.role === 'owner');
}

/**
 * Where a new project opens: the AI chat, which can design its schema. The
 * chat route itself, not `/ai`: that redirect would drop the navigation state
 * carrying the onboarding prompt.
 */
export function newProjectPath(projectId: string): string {
  return `/${projectId}/ai/agent`;
}
