import { normalizeEntity } from './normalize-entity';
import type { Config, Entity } from './types';

/** Types and returns a `flexkit.config.ts` export unchanged. */
export function defineConfig<T extends Config>(config: T): T {
  return config;
}

/**
 * Types an entity and normalizes it: asset attributes get `scope: 'global'`,
 * and invalid asset scopes or display attributes throw at config load time.
 */
export function defineEntity<T extends Entity>(entity: T): Entity {
  return normalizeEntity(entity);
}
