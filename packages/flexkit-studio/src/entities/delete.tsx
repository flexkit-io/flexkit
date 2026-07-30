'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { find, propEq } from 'ramda';
import { toast } from 'sonner';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import { getEntityDeleteMutation, getEntityDeleteWhere } from '../graphql-client/queries';
import { getEntityListQueryName, scheduleEntityListRemoval } from '../graphql-client/refetch-entity-lists';
import AlertDialog from '../ui/components/alert-dialog';
import { useConfig } from '../core/config/config-context';
import { useDispatch } from './actions-context';
import type { SingleProject } from '../core/config/types';
import type { ActionDeleteEntity } from './types';

type Props = {
  action: ActionDeleteEntity;
};

export default function Delete({ action }: Props): JSX.Element {
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const apolloClient = useApolloClient();
  const [runMutation, setMutation, setOptions] = useEntityMutation();
  const dispatch = useDispatch();
  const hasFiredSilentDeletionRef = useRef(false);
  const idsToDelete = Array.isArray(action.payload.entityId) ? action.payload.entityId : [action.payload.entityId];
  const entityName = action.payload.entityName === '_asset' ? 'asset' : action.payload.entityName.toLowerCase();
  const isSilent = Boolean(action.payload.silent);
  const isBatch = idsToDelete.length > 1;

  // Fire silent deletions exactly once. Running this from the render body
  // re-triggered the mutation on every re-render, flooding /graphql.
  useEffect(() => {
    if (!isSilent || hasFiredSilentDeletionRef.current) {
      return;
    }

    hasFiredSilentDeletionRef.current = true;
    void handleDeletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSilent]);

  if (isSilent) {
    return <></>;
  }

  const dialogOptions = {
    dialogTitle: isBatch ? `Delete ${idsToDelete.length} ${entityName}s` : `Delete ${entityName}`,
    dialogMessage: isBatch
      ? `Are you sure you want to delete the selected ${entityName}s? They will be deleted permanently.`
      : `Are you sure you want to delete the selected ${entityName}? The item will be deleted permanently.`,
    dialogCancelTitle: 'Cancel',
    dialogActionLabel: 'Delete',
    isDestructive: true,
    dialogActionSubmit: () => handleDeletion(),
  };

  function handleDeletion(): Promise<void> {
    const mutation = getEntityDeleteMutation(action.payload.entityName, schema, idsToDelete);

    return new Promise<void>((resolve, reject) => {
      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        variables: { where: getEntityDeleteWhere(idsToDelete) },
        update(cache: { evict: (arg0: { id: string }) => void }) {
          for (const id of idsToDelete) {
            cache.evict({ id });
          }
        },
        onCompleted: () => {
          toast.success(isBatch ? 'Items successfully deleted.' : 'Item successfully deleted.');
          void scheduleEntityListRemoval(
            apolloClient,
            getEntityListQueryName(action.payload.entityName, schema),
            idsToDelete
          );
          dispatch({ type: 'Dismiss', _id: action._id, payload: {} });
          resolve();
        },
        onError: (error: Error) => {
          reject(error);
        },
      });
      runMutation(true);
    });
  }

  return <AlertDialog options={dialogOptions} />;
}
