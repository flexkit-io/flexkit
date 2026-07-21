'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { find, propEq } from 'ramda';
import { toast } from 'sonner';
import { gql } from '@apollo/client';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import { getEntityDeleteMutation } from '../graphql-client/queries';
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
  const [runMutation, setMutation, setOptions] = useEntityMutation();
  const dispatch = useDispatch();
  const hasFiredSilentDeletionRef = useRef(false);
  const entityName = action.payload.entityName === '_asset' ? 'asset' : action.payload.entityName.toLowerCase();
  const isSilent = Boolean(action.payload.silent);

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
    dialogTitle: `Delete ${entityName}`,
    dialogMessage: `Are you sure you want to delete the selected ${entityName}? The item will be deleted permanently.`,
    dialogCancelTitle: 'Cancel',
    dialogActionLabel: 'Delete',
    isDestructive: true,
    dialogActionSubmit: () => handleDeletion(),
  };

  function handleDeletion(): Promise<void> {
    const _id = action.payload.entityId;
    const mutation = getEntityDeleteMutation(action.payload.entityName, schema, _id);

    return new Promise<void>((resolve) => {
      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        variables: { where: { _id: { eq: _id } } },
        update(cache: { evict: (arg0: { id: string }) => void }) {
          cache.evict({ id: _id });
        },
        onCompleted: () => {
          toast.success('Item successfully deleted.');

          if (isSilent) {
            dispatch({ type: 'Dismiss', _id: action._id, payload: {} });
          }

          resolve();
        },
      });
      runMutation(true);
    });
  }

  return <AlertDialog options={dialogOptions} />;
}
