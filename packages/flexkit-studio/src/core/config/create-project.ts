import { userApiPaths } from '../api-paths';
import type { HostedTeam } from './types';

/** What `POST /api/me/projects` answers: the new project and the team it went to (possibly a new personal team). */
export type CreatedProject = { project: { id: string; name: string }; team: { id: string; name: string } };

export type CreateProjectOutcome = ({ ok: true } & CreatedProject) | { ok: false; code: string; message: string };

const FALLBACK_MESSAGE = 'Could not create the project. Please try again.';

/** Hosted mode: creates a project for the signed-in user (Free plan, user as owner). */
export async function createHostedProject(input: { name: string; teamId?: string }): Promise<CreateProjectOutcome> {
  try {
    const response = await fetch(userApiPaths.myProjects, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      error?: string;
      project?: { id: string; name: string };
      team?: { id: string; name: string };
    };

    if (response.ok && body.project?.id && body.team?.id) {
      return { ok: true, project: body.project, team: body.team };
    }

    return { ok: false, code: body.code ?? 'unknown_error', message: body.error ?? FALLBACK_MESSAGE };
  } catch {
    return {
      ok: false,
      code: 'network_error',
      message: 'Flexkit is not reachable. Check your connection and try again.',
    };
  }
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
