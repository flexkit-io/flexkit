import type { Config } from './types';

export function defineConfig<T extends Config>(config: T): T {
  return config;
}
