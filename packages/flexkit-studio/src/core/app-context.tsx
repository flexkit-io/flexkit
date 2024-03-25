'use client';

import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { AppAction, AppContextType } from './types';

const scopeStorageKey = 'core.context.scope';
const savedScope = typeof localStorage !== 'undefined' ? localStorage.getItem(scopeStorageKey) : '';
const initialState = {
  breadcrumbs: [],
  isRouteLoading: false,
  pageTitle: '',
  scope: savedScope ?? 'default',
  relationships: {},
};

const AppContext = createContext<AppContextType>(initialState);

const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {
  /* void */
});

function reducer(state: AppContextType, action: AppAction): AppContextType {
  const { type, payload } = action;

  switch (type) {
    case 'setScope':
      typeof localStorage !== 'undefined' && localStorage.setItem(scopeStorageKey, payload as string);

      return {
        ...state,
        scope: payload,
      };
    case 'setRelationship':
      return {
        ...state,
        relationships: payload,
      };
    default:
      throw Error(`Unknown action: ${type as string}`);
  }
}

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  return useContext(AppContext);
}

export function useAppDispatch(): Dispatch<AppAction> {
  return useContext(AppDispatchContext);
}
