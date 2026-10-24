'use client';

import type { JSX, ReactNode } from 'react';
import AlertDialog from '../ui/components/alert-dialog';
import { DrawerStackProvider } from '../ui/components/drawer-modal';
import { useActions } from './actions-context';
import Delete from './delete';
import AddEntity from './add-entity';
import EditEntity from './edit-entity';
import EditRelationship from './edit-relationship';
import type { Action } from './types';

const DRAWER_ACTION_TYPES = ['AddEntity', 'EditEntity', 'EditRelationship'];

/**
 * Renders the drawer actions as a chain: each drawer carries the next one
 * as its `nested` child, so the drawer library knows they stack and keeps
 * the ones behind mounted and partly visible.
 */
function renderDrawerStack(actions: Action[], index: number): ReactNode {
  const action = actions[index];

  if (!action) {
    return null;
  }

  const nested = renderDrawerStack(actions, index + 1);
  const isFocused = index === actions.length - 1;

  switch (action.type) {
    case 'AddEntity': {
      return <AddEntity action={action} depth={index} isFocused={isFocused} key={action._id} nested={nested} />;
    }
    case 'EditEntity': {
      return <EditEntity action={action} depth={index} isFocused={isFocused} key={action._id} nested={nested} />;
    }
    case 'EditRelationship': {
      return <EditRelationship action={action} depth={index} isFocused={isFocused} key={action._id} nested={nested} />;
    }
    default: {
      return null;
    }
  }
}

export function ActionsManager(): JSX.Element | null {
  const actions = useActions();
  const drawerActions = actions.filter((item) => DRAWER_ACTION_TYPES.includes(item.type));

  return (
    <>
      {actions.map((action) => {
        switch (action.type) {
          case 'AlertDialog': {
            const { payload } = action;

            return <AlertDialog key={action._id} options={payload.options} />;
          }
          case 'DeleteEntity': {
            return <Delete action={action} key={action._id} />;
          }
          default: {
            return null;
          }
        }
      })}
      <DrawerStackProvider size={drawerActions.length}>{renderDrawerStack(drawerActions, 0)}</DrawerStackProvider>
    </>
  );
}
