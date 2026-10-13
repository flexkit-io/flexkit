export type AssetViewMode = 'list' | 'grid';

const VIEW_MODE_STORAGE_KEY = 'flexkit-asset-manager:viewMode';

export function getStoredViewMode(): AssetViewMode {
  if (typeof localStorage === 'undefined') {
    return 'grid';
  }

  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);

    if (stored === 'list' || stored === 'grid') {
      return stored;
    }
  } catch {
    // Ignore storage access errors (private mode, blocked storage, etc.)
  }

  return 'grid';
}

export function setStoredViewMode(mode: AssetViewMode): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage access errors (private mode, blocked storage, etc.)
  }
}
