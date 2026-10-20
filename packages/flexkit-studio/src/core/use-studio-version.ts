'use client';

import { useEffect, useState } from 'react';
import { getDesktop } from './desktop';

export interface StudioVersion {
  current: string;
  latest: string;
  isCurrent: boolean;
  /** Applies the newer version (the desktop app restarts into it); undefined when there is nothing to apply. */
  upgrade?: () => void;
}

const WEB_VERSION: StudioVersion = { current: '1.0.0', latest: '1.0.0', isCurrent: true };

/**
 * The Studio version shown in the app bar. The web Studio is always current
 * (the hosted Studio deploys with the packages); the desktop app reports its
 * own version and the update it has downloaded, if any.
 */
export function useStudioVersion(): StudioVersion {
  const desktop = getDesktop();
  const [downloaded, setDownloaded] = useState<string | null>(null);

  useEffect(() => {
    if (!desktop) {
      return;
    }

    return desktop.onUpdateDownloaded((update) => {
      setDownloaded(update.version);
    });
  }, [desktop]);

  if (!desktop) {
    return WEB_VERSION;
  }

  if (downloaded === null) {
    return { current: desktop.version, latest: desktop.version, isCurrent: true };
  }

  return { current: desktop.version, latest: downloaded, isCurrent: false, upgrade: () => desktop.installUpdate() };
}
