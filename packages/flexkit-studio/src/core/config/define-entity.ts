import type { Entity } from '../types';
import { normalizeEntity } from './normalize-entity';

export function defineEntity<T extends Entity>(entity: T): Entity {
  return normalizeEntity(entity);
}
