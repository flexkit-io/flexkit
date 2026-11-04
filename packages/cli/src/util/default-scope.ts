/** A scope as the config and the CLI see it. */
type ScopeLike = { name: string; isDefault?: boolean };

/**
 * The scope local values fall back to: the one marked `isDefault`, whatever
 * its name, else the first scope; `default` for a project without scopes.
 * Studio and the backend read it the same way.
 */
export function getDefaultScopeName(scopes: readonly ScopeLike[] | null | undefined): string {
  return scopes?.find((scope) => scope.isDefault)?.name ?? scopes?.[0]?.name ?? 'default';
}
