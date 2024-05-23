'use client';

import { createContext, useContext, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import { props, uniqBy } from 'ramda';
import { ActionType } from './types';
import type {
  Action,
  ActionAddEntity,
  ActionAlertDialog,
  ActionDeleteEntity,
  ActionEditEntity,
  ActionEditRelationship,
} from './types';

const ActionsContext = createContext<Action[] | []>([]);
const EntityDispatchContext = createContext<Dispatch<Action>>(() => undefined);

function actionsReducer(actions: Action[], action: Action): Action[] {
  const actionType = action.type as ActionType;

  if (!action._id) {
    action._id = `${Date.now()}`;
  }

  switch (actionType) {
    case ActionType.DeleteEntity: {
      return uniqBy(props(['type' as string, '_id']), [
        ...(actions as ActionDeleteEntity[]),
        action as ActionDeleteEntity,
      ]);
    }
    case ActionType.AddEntity: {
      return uniqBy(props(['type' as string, '_id']), [...(actions as ActionAddEntity[]), action as ActionAddEntity]);
    }
    case ActionType.EditEntity: {
      return uniqBy(props(['type' as string, '_id']), [...(actions as ActionEditEntity[]), action as ActionEditEntity]);
    }
    case ActionType.EditRelationship: {
      return uniqBy(props(['type' as string, '_id']), [
        ...(actions as ActionEditRelationship[]),
        action as ActionEditRelationship,
      ]);
    }
    case ActionType.AlertDialog: {
      return uniqBy(props(['type' as string, '_id']), [
        ...(actions as ActionAlertDialog[]),
        action as ActionAlertDialog,
      ]);
    }
    case ActionType.Dismiss: {
      return actions.filter((item) => item._id !== action._id);
    }
    default: {
      throw Error(`Unknown action: ${actionType as string}`);
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
