import { createContext, useContext } from 'react';

type DrawerModalContextType = {
  isDirty: (flag: boolean) => void;
};

export const DrawerModalContext = createContext<DrawerModalContextType>({
  isDirty: (_flag: boolean) => {
    /* void */
  },
});

export function useDrawerModalContext(): DrawerModalContextType {
  return useContext(DrawerModalContext);
}
