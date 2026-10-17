import { createContext, useContext, useEffect, useState } from 'react';

/**
 * Whether the app around a component is the one in front. Opened apps stay
 * mounted behind the active one (see `AppOutlet`), so their effects keep
 * running; this tells them apart. Outside an app it is `true`.
 */
export const AppActiveContext = createContext(true);

export function useIsAppActive(): boolean {
  return useContext(AppActiveContext);
}

function isWindowInFront(): boolean {
  return typeof document === 'undefined' || (document.visibilityState === 'visible' && document.hasFocus());
}

/**
 * The person is looking at this app right now: it is the app in front, the
 * tab is visible and the browser window has focus.
 */
export function useIsViewing(): boolean {
  const isAppActive = useIsAppActive();
  const [isInFront, setIsInFront] = useState(isWindowInFront);

  useEffect(() => {
    const update = (): void => setIsInFront(isWindowInFront());

    update();
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    document.addEventListener('visibilitychange', update);

    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return isAppActive && isInFront;
}
