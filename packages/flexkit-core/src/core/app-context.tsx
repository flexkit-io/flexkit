'use client';

import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { ActionSetRelationship, ActionSetScope, AppContextType } from './types';

export const SCOPE_STORAGE_KEY = 'core.context.scope:';

const initialState = {
  breadcrumbs: [],
  isRouteLoading: false,
  pageTitle: '',
  scope: '',
  relationships: {},
};

const AppContext = createContext<AppContextType>(initialState);

const AppDispatchContext = createContext<Dispatch<ActionSetRelationship | ActionSetScope>>(() => {
  /* void */
});

function reducer(state: AppContextType, action: ActionSetRelationship | ActionSetScope): AppContextType {
  const { type, payload } = action;

  switch (type) {
    case 'setScope':
      if (typeof localStorage !== 'undefined' && payload.projectId) {
        localStorage.setItem(`${SCOPE_STORAGE_KEY}${payload.projectId}`, payload.scope);
      }

      return {
        ...state,
        scope: payload.scope,
      };
    case 'setRelationship':
      return {
        ...state,
        relationships: { ...state.relationships, ...payload },
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

export function useAppDispatch(): Dispatch<ActionSetRelationship | ActionSetScope> {
  return useContext(AppDispatchContext);
}
