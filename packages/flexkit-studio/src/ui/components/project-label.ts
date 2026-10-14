import type { ProjectSummary, ProjectUiConfig } from '../../core/config/types';

/** Name of a project: the listed name, else the deployed schema title, else the id. */
export function getProjectLabel(
  projectId: string,
  projects: ProjectUiConfig[],
  projectSummaries: ProjectSummary[] = []
): string {
  return (
    projectSummaries.find((project) => project.id === projectId)?.name ??
    projects.find((project) => project.projectId === projectId)?.title ??
    projectId
  );
}

/** Groups ids by team when the summaries span more than one team; otherwise a single unnamed group. */
export function groupProjectIdsByTeam(
  projectIds: string[],
  projectSummaries: ProjectSummary[]
): { label: string | null; projectIds: string[] }[] {
  const teams = new Map<string, { label: string; projectIds: string[] }>();

  for (const id of projectIds) {
    const summary = projectSummaries.find((project) => project.id === id);
    const key = summary?.team.id ?? '';
    const group = teams.get(key) ?? { label: summary?.team.name ?? '', projectIds: [] };
    group.projectIds.push(id);
    teams.set(key, group);
  }

  if (teams.size <= 1) {
    return [{ label: null, projectIds }];
  }

  return [...teams.values()].map((group) => ({ label: group.label || null, projectIds: group.projectIds }));
}
