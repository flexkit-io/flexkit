'use client';

import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { find, propEq } from 'ramda';
import { toast } from 'sonner';
import { gql } from '@apollo/client';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '../core/app-context';
import type { SingleProject } from '../core/config/types';
import DrawerModal from '../ui/components/drawer-modal';
import { useDrawerModalContext } from '../ui/drawer-modal-context';
import { useConfig } from '../core/config/config-context';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import FormBuilder from '../form/form-builder';
import type { SubmitHandle } from '../form/form-builder';
import type { Entity } from '../core/types';
import { getEntityCreateMutation, getEntityQuery } from '../graphql-client/queries';
import type { EntityData } from '../graphql-client/types';
import { Button } from '../ui/primitives/button';
import { useDispatch } from './actions-context';
import { type Action, type ActionAddEntity } from './types';

type Props = {
  action: ActionAddEntity;
  depth: number;
  isFocused: boolean;
};

export default function AddEntity({ action, depth, isFocused }: Props): JSX.Element {
  const { entityName } = action.payload;
  const ref = useRef<SubmitHandle>(null);
  const { projects, currentProjectId } = useConfig();
  const { schema, scopes } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const defaultScope = scopes?.find((s) => s.isDefault)?.name ?? 'default';
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const entityNamePlural = entitySchema?.plural ?? entityName;
  const { scope } = useAppContext();
  const dispatch = useDispatch();
  const [runMutation, setMutation, setOptions, mutationData] = useEntityMutation();
  const { setIsDirty } = useDrawerModalContext();

  useEffect(() => {
    if (mutationData.error) {
      ref.current?.hasErrors();
    }
  }, [mutationData.error]);

  function handleBeforeClose(): boolean {
    if (ref.current?.hasDataChanged()) {
      dispatch({
        type: 'AlertDialog',
        _id: 'unsavedChanges',
        payload: {
          options: {
            dialogTitle: 'Unsaved Changes',
            dialogMessage:
              'Are you sure you want to leave? There are unsaved changes. If you leave, your changes will be lost.',
            dialogCancelTitle: 'Stay Here',
            dialogActionLabel: 'Discard Changes',
            dialogActionCancel: () => {
              dispatch({ type: 'Dismiss', _id: 'unsavedChanges', payload: {} });
            },
            dialogActionSubmit: () => {
              dispatch({ type: 'Dismiss', _id: action._id, payload: {} });
            },
          },
        },
      });

      return false;
    }

    return true;
  }

  const handleClose = useCallback(
    (_id: Action['_id']) => {
      dispatch({ type: 'Dismiss', _id, payload: {} });
    },
    [dispatch]
  );

  const handleSave = useCallback(() => {
    ref.current?.submit();
  }, [ref]);

  const saveEntity = useCallback(
    (newData: EntityData) => {
      const _id = uuidv4();
      const mutation = getEntityCreateMutation(entityNamePlural, schema, newData, _id);
      const entityQuery = getEntityQuery(entityNamePlural, scope, schema);
      const refreshQuery = gql`
        ${entityQuery.query}
      `;

      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        refetchQueries: [refreshQuery],
        onCompleted: () => {
          handleClose(action._id);
          toast.success('Your changes have been saved.');
        },
      });
      runMutation(true);
    },
    [action._id, entityNamePlural, handleClose, runMutation, schema, setMutation, scope, setOptions]
  );

  return (
    <DrawerModal
      actions={
        <Button
          className="fk-px-8"
          onClick={() => {
            handleSave();
          }}
          variant="default"
        >
          {mutationData.loading ? <Loader2 className="fk-h-4 fk-w-4 fk-mr-2 fk-animate-spin" /> : null}
          Save
        </Button>
      }
      beforeClose={handleBeforeClose}
      depth={depth}
      isFocused={isFocused}
      onClose={() => {
        handleClose(action._id);
      }}
      title={`Add ${entityName}`}
    >
      <FormBuilder
        currentScope={scope}
        defaultScope={defaultScope}
        entityName={entityName}
        entityNamePlural={entityNamePlural}
        onSubmit={saveEntity}
        ref={ref}
        schema={schema}
        setIsDirty={setIsDirty}
      />
    </DrawerModal>
  );
}
