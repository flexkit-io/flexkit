/** Dashboard Usage page of a project, or of its team. */
export function usagePageUrl(origin: string, teamId: string, projectId?: string): string {
  const team = encodeURIComponent(teamId);

  return projectId
    ? `${origin}/dashboard/${team}/${encodeURIComponent(projectId)}/usage`
    : `${origin}/dashboard/${team}/usage`;
}
