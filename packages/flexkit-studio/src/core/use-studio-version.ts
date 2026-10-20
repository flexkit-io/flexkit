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

// `@flexkit/studio`'s own version, inlined at build time; a build without the
// define (tests, tooling) shows a placeholder.
const STUDIO_VERSION = typeof __STUDIO_VERSION__ === 'string' ? __STUDIO_VERSION__ : '0.0.0';
const WEB_VERSION: StudioVersion = { current: STUDIO_VERSION, latest: STUDIO_VERSION, isCurrent: true };

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
