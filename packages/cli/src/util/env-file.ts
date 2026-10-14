import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ENV_FILES = ['.env.local', '.env'];

type ProcessWithLoadEnvFile = NodeJS.Process & { loadEnvFile?: (_path: string) => void };

/**
 * Loads environment files before importing the user's tools, the way their
 * framework would in development. Explicit paths replace the defaults; a
 * missing default is skipped, a missing explicit file is an error. Existing
 * variables win over file values (Node's `loadEnvFile` semantics).
 */
export function loadEnvFiles(
  cwd: string,
  explicit: string[] | undefined
): { loaded: string[]; unsupported: boolean } {
  const { loadEnvFile } = process as ProcessWithLoadEnvFile;
  const files = explicit && explicit.length > 0 ? explicit : DEFAULT_ENV_FILES;
  const loaded: string[] = [];

  for (const file of files) {
    const resolved = path.resolve(cwd, file);

    if (!fs.existsSync(resolved)) {
      if (explicit && explicit.length > 0) {
        throw new Error(`Environment file not found: ${resolved}`);
      }

      continue;
    }

    if (typeof loadEnvFile !== 'function') {
      return { loaded, unsupported: true };
    }

    loadEnvFile(resolved);
    loaded.push(file);
  }

  return { loaded, unsupported: false };
}
