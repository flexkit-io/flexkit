import type Client from './client';
import { getCommandName } from './pkg';
import { findLinkFile, findProjectLink, isValidProjectId } from './project-link';

export type ProjectSource = 'flag' | 'env' | 'link' | 'config';

export interface ResolvedProject {
  projectId: string;
  source: ProjectSource;
}

/**
 * Resolves the project a command acts on, in this order:
 *
 * 1. `--project <id>`
 * 2. the `FLEXKIT_PROJECT_ID` environment variable
 * 3. the nearest `.flexkit/project.json` written by `flexkit link`
 * 4. the only project of the local `flexkit.config.ts`
 *
 * Prints an error and returns null when none of them names a single project.
 */
export function resolveProjectId(client: Client, projectFlag: string | undefined): ResolvedProject | null {
  const resolved = findProject(client, projectFlag);

  if (resolved && !isValidProjectId(resolved.projectId)) {
    client.output.error(`Invalid project ID "${resolved.projectId}" (from ${SOURCE_LABELS[resolved.source]}).`);

    return null;
  }

  return resolved;
}

const SOURCE_LABELS: Record<ProjectSource, string> = {
  flag: '--project',
  env: 'FLEXKIT_PROJECT_ID',
  link: '.flexkit/project.json',
  config: 'flexkit.config.ts',
};

function findProject(client: Client, projectFlag: string | undefined): ResolvedProject | null {
  if (projectFlag) {
    return { projectId: projectFlag, source: 'flag' };
  }

  const fromEnv = process.env.FLEXKIT_PROJECT_ID?.trim();

  if (fromEnv) {
    return { projectId: fromEnv, source: 'env' };
  }

  const linkFile = findLinkFile(client.cwd);

  if (linkFile) {
    const found = findProjectLink(client.cwd);

    if (found) {
      return { projectId: found.link.projectId, source: 'link' };
    }

    // Don't fall back to another project when the link is broken: a destructive
    // command would silently act on the wrong one.
    client.output.error(
      `${linkFile} is not a valid project link. Run ${getCommandName('link')} again, or pass --project <id>.`
    );

    return null;
  }

  const projects = client.flexkitConfig?.projects ?? [];

  if (projects.length === 1 && projects[0]) {
    return { projectId: projects[0].projectId, source: 'config' };
  }

  if (projects.length > 1) {
    client.output.error(
      `The local config defines several projects. Pass --project <id> to choose one of: ${projects
        .map((project) => project.projectId)
        .join(', ')}`
    );

    return null;
  }

  client.output.error(
    `No project selected. Run ${getCommandName('link')} in this folder, pass --project <id>, or set FLEXKIT_PROJECT_ID.`
  );

  return null;
}
