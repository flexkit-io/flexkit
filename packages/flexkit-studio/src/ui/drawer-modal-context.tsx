import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type DrawerModalContextType = {
  isDirty: boolean;
  setIsDirty: (flag: boolean) => void;
};

export const DrawerModalContext = createContext<DrawerModalContextType>({
  isDirty: false,
  setIsDirty: (_flag: boolean) => {
    /* void */
  },
});

export const DrawerModalProvider = ({ children }: { children: ReactNode }) => {
  const [dirty, setDirty] = useState(false);

  const value = useMemo(() => {
    const setIsDirty = (flag: boolean) => {
      setDirty(flag);
    };

    return { isDirty: dirty, setIsDirty };
  }, [dirty, setDirty]);

  return <DrawerModalContext.Provider value={value}>{children}</DrawerModalContext.Provider>;
};

export function useDrawerModalContext(): DrawerModalContextType {
  return useContext(DrawerModalContext);
}
