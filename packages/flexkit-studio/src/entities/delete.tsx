'use client';

import { useEffect } from 'react';
import { find, propEq } from 'ramda';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { gql } from '@apollo/client';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import { getEntityDeleteMutation } from '../graphql-client/queries';
import AlertDialog from '../ui/components/alert-dialog';
import { useConfig } from '../core/config/config-context';
import type { SingleProject } from '../core/config/types';
import { useDispatch } from './actions-context';
import type { ActionDeleteEntity } from './types';

type Props = {
  action: ActionDeleteEntity;
};

export default function Delete({ action }: Props): JSX.Element {
  const dispatch = useDispatch();
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const [runMutation, setMutation, setOptions, mutationData] = useEntityMutation();

  const dialogOptions = {
    dialogTitle: `Delete ${action.payload.entityName.toLowerCase()}`,
    dialogMessage: `Are you sure you want to delete the selected ${action.payload.entityName.toLowerCase()}? The item will be deleted permanently.`,
    dialogCancelTitle: 'Cancel',
    dialogActionLabel: 'Delete',
    dialogActionCancel: () => {
      // setTimeout(() => {
      //   dispatch({ type: 'dismiss', _id: action._id, payload: {} });
      // }, 500);
    },
    dialogActionSubmit: () => {
      handleDeletion();
    },
  };

  function handleDeletion(): void {
    const _id = action.payload.entityId;
    const mutation = getEntityDeleteMutation(action.payload.entityName, schema, _id);

    setMutation(gql`
      ${mutation}
    `);
    setOptions({
      variables: { where: { _id } },
      update(cache: { evict: (arg0: { id: string }) => void }) {
        cache.evict({ id: _id });
      },
    });
    runMutation(true);
  }

  useEffect(() => {
    if (!mutationData.loading && Object.keys(mutationData.data ?? {}).length > 0) {
      // dispatch({ type: 'dismiss', _id: action._id, payload: {} });

      dispatch({
        type: 'notify',
        payload: {
          options: {
            notificationType: 'success',
            notificationMessage: 'Item successfully deleted.',
          },
        },
      });
    }
  }, [action._id, dispatch, mutationData.data, mutationData.loading]);

  return <AlertDialog options={dialogOptions} />;
}
