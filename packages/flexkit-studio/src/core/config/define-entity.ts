import type { Entity } from '../types';

export function defineEntity<T extends Entity>(entity: T): T {
  return entity;
}
