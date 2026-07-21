import { getCommandName } from './pkg';
import type Client from './client';
import type { FlexkitConfig } from '../types';

type ConfiguredProject = FlexkitConfig['projects'][number];

/**
 * Resolves the target project from the local flexkit.config file. When the
 * config defines several projects, --project selects one of them.
 */
export function resolveProject(client: Client, projectFlag: string | undefined): ConfiguredProject | null {
  const { output } = client;
  const projects = client.flexkitConfig?.projects ?? [];

  if (projects.length === 0) {
    output.error(
      `No project configuration found. Run this command from a directory with a flexkit.config file or pass --local-config. See ${getCommandName('--help')}.`
    );

    return null;
  }

  if (projectFlag) {
    const match = projects.find((project) => project.projectId === projectFlag);

    if (!match) {
      output.error(
        `Project "${projectFlag}" is not defined in the local config. Available projects: ${projects
          .map((project) => project.projectId)
          .join(', ')}`
      );

      return null;
    }

    return match;
  }

  if (projects.length > 1) {
    output.error(
      `Multiple projects found in the local config. Pass --project <projectId> to select one of: ${projects
        .map((project) => project.projectId)
        .join(', ')}`
    );

    return null;
  }

  return projects[0];
}
