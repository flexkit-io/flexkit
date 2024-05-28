'use client';

import { useCallback, useEffect, useRef } from 'react';
import { find, propEq } from 'ramda';
import { toast } from 'sonner';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { gql } from '@apollo/client';
import { useAppContext } from '../core/app-context';
import type { SingleProject } from '../core/config/types';
import DrawerModal from '../ui/components/drawer-modal';
// import EditMenu from './EditMenu';
import { useConfig } from '../core/config/config-context';
import { useEntityQuery } from '../graphql-client/use-entity-query';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import { getEntityUpdateMutation } from '../graphql-client/queries';
import type { EntityData, FormEntityItem } from '../graphql-client/types';
import FormBuilder from '../form/form-builder';
import type { SubmitHandle } from '../form/form-builder';
import type { Entity } from '../core/types';
import { useDispatch } from './actions-context';
import Loading from './loading';
import { type Action, ActionType, type ActionEditEntity } from './types';

type Props = {
  action: ActionEditEntity;
  depth: number;
  isFocused: boolean;
};

export default function EditEntity({ action, depth, isFocused }: Props): JSX.Element {
  const { entityId, entityNamePlural } = action.payload;
  const ref = useRef<SubmitHandle>(null);
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entityNamePlural, 'plural'))(schema) as Entity | undefined;
  const entityName = entitySchema?.name ?? entityNamePlural;
  const { scope } = useAppContext();
  const dispatch = useDispatch();
  const [runMutation, setMutation, setOptions, mutationData] = useEntityMutation();

  useEffect(() => {
    if (mutationData.error) {
      ref.current?.hasErrors();
    }
  }, [mutationData.error]);

  const handleBeforeClose = useCallback(() => {
    if (ref.current?.hasDataChanged()) {
      dispatch({
        type: ActionType.AlertDialog,
        _id: 'unsavedChanges',
        payload: {
          options: {
            dialogTitle: 'Unsaved Changes',
            dialogMessage:
              'Are you sure you want to leave? There are unsaved changes. If you leave, your changes will be lost.',
            dialogCancelTitle: 'Stay Here',
            dialogActionLabel: 'Discard Changes',
            dialogActionCancel: () => {
              dispatch({ type: ActionType.Dismiss, _id: 'unsavedChanges', payload: {} });
            },
            dialogActionSubmit: () => {
              dispatch({ type: ActionType.Dismiss, _id: action._id, payload: {} });
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
      dispatch({ type: ActionType.Dismiss, _id, payload: {} });
    },
    [dispatch]
  );

  const handleSave = useCallback(() => {
    ref.current?.submit();
  }, [ref]);

  const saveEntity = useCallback(
    (newData: EntityData, previousData?: FormEntityItem) => {
      console.log('OJOOO', { newData });
      if (!previousData) return;

      const mutation = getEntityUpdateMutation(entityNamePlural, scope, schema, previousData, newData);
      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        variables: { where: { _id: entityId } },
        onCompleted: () => {
          handleClose(action._id);
          toast.success('Your changes have been saved.');
        },
      });
      runMutation(true);
    },
    [action._id, entityId, entityNamePlural, handleClose, schema, runMutation, setMutation, setOptions, scope]
  );

  const [loading, { results }] = useEntityQuery({
    entityNamePlural,
    schema,
    scope,
    variables: { where: { _id: entityId } },
    isForm: true,
  }) as [boolean, { results: FormEntityItem[] }];

  const primaryAttributeName =
    entitySchema?.attributes.find((attr) => attr.isPrimary)?.name ?? entitySchema?.attributes[0]?.name ?? '';
  const entityIdentifier = !loading && results.length ? results[0][primaryAttributeName].value : '';

  return (
    <DrawerModal
      beforeClose={handleBeforeClose}
      depth={depth}
      // editMenu={<EditMenu />}
      isFocused={isFocused}
      isSaving={mutationData.loading}
      onClose={() => {
        handleClose(action._id);
      }}
      onSave={() => {
        handleSave();
      }}
      title={entityIdentifier as string}
    >
      {loading || !results.length ? (
        <Loading />
      ) : (
        <FormBuilder
          entityId={entityId}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          formData={results[0]}
          onSubmit={saveEntity}
          ref={ref}
          schema={schema}
        />
      )}
    </DrawerModal>
  );
}
