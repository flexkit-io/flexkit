'use client';

import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { props, uniqBy } from 'ramda';
import type { Action } from './types';

const ActionsContext = createContext<Action[] | []>([]);
const EntityDispatchContext = createContext<Dispatch<Action>>(() => undefined);

function actionsReducer(actions: Action[], action: Action): Action[] {
  if (!action._id) {
    action._id = `${Date.now()}`;
  }

  switch (action.type) {
    case 'delete':
    case 'addEntity':
    case 'editEntity':
    case 'editRelationship':
    case 'alertDialog':
    case 'notify': {
      return uniqBy(props(['type' as string, '_id']), [...actions, action]);
    }
    case 'dismiss': {
      return actions.filter((item) => item._id !== action._id);
    }
    default: {
      throw Error(`Unknown action: ${action.type}`);
    }
  }
}

function ActionsProvider({ children }: { children: ReactNode }): JSX.Element {
  const [entityActions, dispatchEntityActions] = useReducer(actionsReducer, []);

  return (
    <ActionsContext.Provider value={entityActions}>
      <EntityDispatchContext.Provider value={dispatchEntityActions}>{children}</EntityDispatchContext.Provider>
    </ActionsContext.Provider>
  );
}

function useActions(): Action[] {
  return useContext(ActionsContext);
}

function useDispatch(): Dispatch<Action> {
  return useContext(EntityDispatchContext);
}

export { ActionsProvider, useActions, useDispatch };
