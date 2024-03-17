'use client';

import AlertDialog from '../ui/components/alert-dialog';
import { useActions } from './actions-context';
import Delete from './delete';
import AddEntity from './add-entity';
import EditEntity from './edit-entity';
// import EditRelationship from './edit-relationship';
import type { ActionAddEntity, ActionAlertDialog, ActionEditEntity, ActionDeleteEntity } from './types';

export function ActionsManager(): JSX.Element | null {
  const actions = useActions();
  const editActions = actions.filter((item) =>
    ['addEntity', 'editEntity', 'editRelationship'].some((actionType) => actionType === item.type)
  );
  const latestModalId = editActions[editActions.length - 1]?._id;

  return (
    <>
      {actions.map((action) => {
        switch (action.type) {
          case 'alertDialog': {
            const { payload } = action as ActionAlertDialog;

            return <AlertDialog key={action._id} options={payload.options} />;
          }
          case 'deleteEntity': {
            return <Delete action={action as ActionDeleteEntity} key={action._id} />;
          }
          case 'addEntity': {
            return (
              <AddEntity action={action as ActionAddEntity} isFocused={action._id === latestModalId} key={action._id} />
            );
          }
          case 'editEntity': {
            return (
              <EditEntity
                action={action as ActionEditEntity}
                isFocused={action._id === latestModalId}
                key={action._id}
              />
            );
          }
          case 'editRelationship': {
            return null; //<EditRelationship action={action} isFocused={action._id === latestModalId} key={action._id} />;
          }
          default: {
            return null;
          }
        }
      })}
    </>
  );
}
