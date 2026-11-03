import { userApiPaths } from '../api-paths';
import type { HostedTeam } from './types';

export type CreateProjectOutcome = { ok: true; projectId: string } | { ok: false; code: string; message: string };

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
      project?: { id: string };
    };

    if (response.ok && body.project?.id) {
      return { ok: true, projectId: body.project.id };
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

/** Teams the user may create projects in, oldest first. */
export function ownedTeams(teams: HostedTeam[]): HostedTeam[] {
  return teams.filter((team) => team.role === 'owner');
}

/** Where a new project opens: the AI chat, which can design its schema. */
export function newProjectPath(projectId: string): string {
  return `/${projectId}/ai`;
}
