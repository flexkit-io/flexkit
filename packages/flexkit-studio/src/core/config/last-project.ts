export const LAST_PROJECT_STORAGE_KEY = 'flexkit-studio:lastProjectId';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** Project the user opened last on this browser, or null. Storage failures are ignored. */
export function readLastProjectId(storage: StorageLike | undefined = defaultStorage()): string | null {
  try {
    const value = storage?.getItem(LAST_PROJECT_STORAGE_KEY);

    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

export function rememberLastProjectId(projectId: string, storage: StorageLike | undefined = defaultStorage()): void {
  try {
    storage?.setItem(LAST_PROJECT_STORAGE_KEY, projectId);
  } catch {
    // Private mode or blocked storage: the Studio simply opens the first project next time.
  }
}

/** Where `/` should go: the remembered project when it is still accessible, else the first one. */
export function pickStartProjectId(projectIds: string[], lastProjectId: string | null): string | undefined {
  if (lastProjectId && projectIds.includes(lastProjectId)) {
    return lastProjectId;
  }

  return projectIds[0];
}
