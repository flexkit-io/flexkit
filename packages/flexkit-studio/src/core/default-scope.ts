import { DEFAULT_SCOPE_KEY } from '../graphql-client/queries';
import { useConfig } from './config/config-context';

type ScopeLike = { name: string; isDefault?: boolean };

/**
 * The scope local values fall back to: the one marked `isDefault`, whatever
 * its name. A project without scopes has a single scope named `default`.
 */
export function defaultScopeName(scopes: readonly ScopeLike[] | null | undefined): string {
  return scopes?.find((scope) => scope.isDefault)?.name ?? scopes?.[0]?.name ?? DEFAULT_SCOPE_KEY;
}

/** The current project's default scope. */
export function useDefaultScope(): string {
  const { currentProject } = useConfig();

  return defaultScopeName(currentProject?.scopes);
}
