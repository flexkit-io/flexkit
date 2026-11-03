import type Client from '../../util/client';
import { getAccountApiUrl } from '../../util/client';
import { findProjectLink } from '../../util/project-link';

interface MeResponse {
  projects: { id: string; name: string; team: { id: string; name: string } }[];
}

/**
 * The team a project belongs to: from `.flexkit/project.json` when it records
 * it, else from `/api/me` (every project the signed-in user can open).
 */
export async function findTeamId(client: Client, projectId: string): Promise<string | null> {
  const found = findProjectLink(client.cwd);

  if (found?.link.projectId === projectId && found.link.teamId) {
    return found.link.teamId;
  }

  const me = await client.fetch<MeResponse>('/api/me');

  return me.projects.find((project) => project.id === projectId)?.team.id ?? null;
}

/** The Dashboard origin next to the API host: `https://api.flexkit.io` → `https://flexkit.io`. */
export function dashboardOrigin(apiUrl: string): string {
  return getAccountApiUrl(apiUrl);
}
