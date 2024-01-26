'use client';

import { useActions } from './actions-context';
import Delete from './Delete';
import AddEntity from './AddEntity';
import EditEntity from './EditEntity';
import EditRelationship from './EditRelationship';
import ModalDialog from '@lib/ui/ModalDialog';
import SnackbarNotification from '../ui/SnackbarNotification';

export default function ActionsManager(): JSX.Element | null {
  const actions = useActions();
  const editActions = actions.filter((item) =>
    ['addEntity', 'editEntity', 'editRelationship'].some((actionType) => actionType === item.type)
  );
  const latestModalId = editActions[editActions.length - 1]?._id;

  return (
    <>
      {actions.map((action) => {
        switch (action.type) {
          case 'delete': {
            return <Delete action={action} key={action._id} />;
          }
          case 'addEntity': {
            return <AddEntity action={action} isFocused={action._id === latestModalId} key={action._id} />;
          }
          case 'editEntity': {
            return <EditEntity action={action} isFocused={action._id === latestModalId} key={action._id} />;
          }
          case 'editRelationship': {
            return <EditRelationship action={action} isFocused={action._id === latestModalId} key={action._id} />;
          }
          case 'modalDialog': {
            return <ModalDialog key={action._id} options={action.payload.options} />;
          }
          case 'notify': {
            return <SnackbarNotification action={action} key={action._id} />;
          }
          default: {
            return null;
          }
        }
      })}
    </>
  );
}
