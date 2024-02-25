'use client';

import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { find, propEq } from 'ramda';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { gql } from '@apollo/client';
import { useAppContext } from '../core/app-context';
import type { SingleProject } from '../core/config/types';
import DrawerModal from '../ui/components/drawer-modal';
// import EditMenu from './EditMenu';
import { useConfig } from '../core/config/config-context';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import FormBuilder from '../form/form-builder';
import type { SubmitHandle } from '../form/form-builder';
import { getEntityCreateMutation, getEntityQuery } from '../graphql-client/queries';
import { useDispatch } from './actions-context';
import type { Action } from './types';

type Props = {
  action: Action;
  isFocused: boolean;
};

export default function AddEntity({ action, isFocused }: Props): JSX.Element {
  const { entityName } = action.payload;
  const ref = useRef<SubmitHandle>(null);
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entityNamePlural = find(propEq(entityName, 'name'))(schema)?.plural ?? entityName;
  const { scope } = useAppContext();
  const dispatch = useDispatch();
  const [runMutation, setMutation, setOptions, mutationData] = useEntityMutation();

  useEffect(() => {
    if (mutationData.error) {
      ref.current?.hasErrors();
    }
  }, [mutationData.error]);

  useEffect(() => {
    if (!mutationData.loading && Object.keys(mutationData.data ?? {}).length > 0) {
      dispatch({
        type: 'notify',
        payload: {
          options: {
            notificationType: 'success',
            notificationMessage: 'Your changes have been saved.',
          },
        },
      });
    }
  }, [dispatch, mutationData.data, mutationData.loading]);

  const handleBeforeClose = useCallback(() => {
    if (ref.current?.hasDataChanged()) {
      dispatch({
        type: 'modalDialog',
        _id: 'unsavedChanges',
        payload: {
          options: {
            dialogTitle: 'Unsaved Changes',
            dialogMessage:
              'Are you sure you want to leave? There are unsaved changes. If you leave, your changes will be lost.',
            dialogCancelTitle: 'Stay Here',
            dialogActionLabel: 'Discard Changes',
            dialogActionCancel: () => {
              dispatch({ type: 'dismiss', _id: 'unsavedChanges', payload: {} });
            },
            dialogActionSubmit: () => {
              dispatch({ type: 'dismiss', _id: action._id, payload: {} });
            },
          },
        },
      });

      return false;
    }

    return true;
  }, [dispatch, action._id]);

  const handleClose = useCallback(
    (_id: Action['_id']) => {
      dispatch({ type: 'dismiss', _id, payload: {} });
    },
    [dispatch]
  );

  const handleSave = useCallback(() => {
    ref.current?.submit();
  }, [ref]);

  const saveEntity = useCallback(
    (_previousData: any, newData: any) => {
      const _id = uuidv4();
      const mutation = getEntityCreateMutation(entityName ?? '', schema, newData, _id);
      console.log({ mutation });
      const entityQuery = getEntityQuery(entityNamePlural, scope, schema);
      const refreshQuery = gql`
        ${entityQuery.query}
      `;

      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        refetchQueries: [refreshQuery],
      });
      runMutation(true);
    },
    [entityName, entityNamePlural, runMutation, schema, setMutation, scope, setOptions]
  );

  return (
    <DrawerModal
      beforeClose={() => handleBeforeClose()}
      // editMenu={<EditMenu />}
      isFocused={isFocused}
      // isSaving={mutationData.loading}
      onClose={() => {
        handleClose(action._id);
      }}
      onSave={() => {
        handleSave();
      }}
      title={`Add ${entityName}`}
    >
      <FormBuilder entityName={entityName ?? ''} formData={[]} onSubmit={saveEntity} ref={ref} schema={schema} />
    </DrawerModal>
  );
}
