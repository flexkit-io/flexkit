import type { StudioExtension } from './types';

/** Define a Studio extension while preserving its specific contribution types. */
export function defineExtension<T extends StudioExtension>(extension: T): T {
  return extension;
}
