'use client';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDesktop } from './desktop';

/**
 * Inside the desktop app: marks the document with the platform (the styles
 * reserve room for the window controls and make the navbar draggable) and
 * opens the paths the app asks for (deep links, menu items). Renders nothing,
 * and does nothing on the web.
 */
export function DesktopEffects(): null {
  const navigate = useNavigate();

  useEffect(() => {
    const desktop = getDesktop();

    if (!desktop) {
      return;
    }

    document.documentElement.dataset.desktopPlatform = desktop.platform;

    return desktop.onNavigate((path) => {
      navigate(path);
    });
  }, [navigate]);

  return null;
}
