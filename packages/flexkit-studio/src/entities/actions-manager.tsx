'use client';

import AlertDialog from '../ui/components/alert-dialog';
import { useActions } from './actions-context';
import Delete from './delete';
import AddEntity from './add-entity';
import EditEntity from './edit-entity';
import EditRelationship from './edit-relationship';

export function ActionsManager(): JSX.Element | null {
  const actions = useActions();
  const editActions = actions.filter((item) =>
    ['AddEntity', 'EditEntity', 'EditRelationship'].some((actionType) => actionType === item.type)
  );
  const latestModalId = editActions[editActions.length - 1]?._id;

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
          case 'AddEntity': {
            return (
              <AddEntity
                action={action}
                depth={editActions.length - 1}
                isFocused={action._id === latestModalId}
                key={action._id}
              />
            );
          }
          case 'EditEntity': {
            return (
              <EditEntity
                action={action}
                depth={editActions.length - 1}
                isFocused={action._id === latestModalId}
                key={action._id}
              />
            );
          }
          case 'EditRelationship': {
            return (
              <EditRelationship
                action={action}
                depth={editActions.length - 1}
                isFocused={action._id === latestModalId}
                key={action._id}
              />
            );
          }
          default: {
            return null;
          }
        }
      })}
    </>
  );
}
