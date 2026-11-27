/** The path of another section of the AI app (e.g. `plugins`, `templates/x`), relative to the current one. */
export function aiSectionPath(pathname: string, section: string): string {
  const match = /^(.*\/ai)(?:\/|$)/.exec(pathname);

  if (!match) {
    return section;
  }

  return `${match[1]}/${section}`;
}
