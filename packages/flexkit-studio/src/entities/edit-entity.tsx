'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { find, propEq } from 'ramda';
import { toast } from 'sonner';
import { gql } from '@apollo/client';
import { useAppContext, useAppDispatch } from '../core/app-context';
import type { SingleProject } from '../core/config/types';
import DrawerModal from '../ui/components/drawer-modal';
import { useDrawerModalContext } from '../ui/drawer-modal-context';
import { useConfig } from '../core/config/config-context';
import { useEntityQuery } from '../graphql-client/use-entity-query';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import { getEntityUpdateMutation } from '../graphql-client/queries';
import type { EntityData, FormEntityItem } from '../graphql-client/types';
import FormBuilder from '../form/form-builder';
import type { SubmitHandle } from '../form/form-builder';
import type { Entity } from '../core/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/primitives/select';
import { useDispatch } from './actions-context';
import SaveButton from './save-button';
import Loading from './loading';
import { type Action, type ActionEditEntity } from './types';

type Props = {
  action: ActionEditEntity;
  depth: number;
  isFocused: boolean;
};

export default function EditEntity({ action, depth, isFocused }: Props): JSX.Element {
  const { entityId, entityNamePlural } = action.payload;
  const ref = useRef<SubmitHandle>(null);
  const { projects, currentProjectId } = useConfig();
  const { schema, scopes } = useCallback(
    () => find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject,
    [currentProjectId, projects]
  )();
  const defaultScope = scopes?.find((s) => s.isDefault)?.name ?? 'default';
  const entitySchema = find(propEq(entityNamePlural, 'plural'))(schema) as Entity | undefined;
  const entityName = entitySchema?.name ?? entityNamePlural;
  const { scope } = useAppContext();
  const [currentScope, setCurrentScope] = useState(scope);
  const dispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const [runMutation, setMutation, setOptions, mutationData] = useEntityMutation();
  const { setIsDirty } = useDrawerModalContext();

  const setFormIsDirty = useCallback(
    (isDirty: boolean) => {
      setIsDirty(isDirty);
    },
    [setIsDirty]
  );

  useEffect(() => {
    if (mutationData.error) {
      ref.current?.hasErrors();
    }
  }, [mutationData.error]);

  const handleBeforeClose = useCallback(() => {
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
  }, [dispatch, action._id]);

  const handleClose = useCallback(
    (_id: Action['_id']) => {
      dispatch({ type: 'Dismiss', _id, payload: {} });
    },
    [dispatch]
  );

  const handleSave = useCallback(() => {
    ref.current?.submit();
  }, [ref]);

  function handleScopeChange(scope: string): void {
    if (ref.current?.hasDataChanged()) {
      dispatch({
        type: 'AlertDialog',
        _id: 'unsavedChanges',
        payload: {
          options: {
            dialogTitle: 'Unsaved Changes',
            dialogMessage: 'You have unsaved changes. Switching scopes will discard them.',
            dialogCancelTitle: 'Stay Here',
            dialogActionLabel: 'Discard Changes',
            dialogActionCancel: () => {
              setCurrentScope(currentScope);
              dispatch({ type: 'Dismiss', _id: 'unsavedChanges', payload: {} });
            },
            dialogActionSubmit: () => {
              setCurrentScope(scope);
              appDispatch({ type: 'setScope', payload: scope });
            },
          },
        },
      });

      return;
    }

    setCurrentScope(scope);
    appDispatch({ type: 'setScope', payload: scope });
  }

  const saveEntity = useCallback(
    (newData: EntityData, previousData?: FormEntityItem) => {
      if (!previousData) return;

      const mutation = getEntityUpdateMutation(entityNamePlural, entityId, currentScope, schema, previousData, newData);
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
    [action._id, entityId, entityNamePlural, handleClose, schema, runMutation, setMutation, setOptions, currentScope]
  );

  const { isLoading, data: results } = useEntityQuery({
    entityNamePlural,
    schema,
    scope: currentScope,
    variables: { where: { _id: entityId } },
    isForm: true,
  });
  const data = results as FormEntityItem[];

  const primaryAttributeName =
    entitySchema?.attributes.find((attr) => attr.isPrimary)?.name ?? entitySchema?.attributes[0]?.name ?? '';
  const entityIdentifier = !isLoading && data.length ? data[0][primaryAttributeName].value : '';

  return (
    <DrawerModal
      actions={
        <>
          {scopes && scopes.length > 1 ? (
            <Select
              onValueChange={(value) => {
                handleScopeChange(value);
              }}
              value={currentScope}
            >
              <SelectTrigger className="fk-w-[12rem] fk-h-9" id="project">
                <span className="fk-text-muted-foreground">Scope:&nbsp;</span>
                <SelectValue>
                  {(find(propEq(currentScope, 'name'))(scopes) as { name: string; label: string }).label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {scopes.map((scopeItem) => (
                  <SelectItem key={scopeItem.name} value={scopeItem.name}>
                    {scopeItem.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <SaveButton handleSave={handleSave} isLoading={mutationData.loading} />
        </>
      }
      beforeClose={handleBeforeClose}
      depth={depth}
      isFocused={isFocused}
      onClose={() => {
        handleClose(action._id);
      }}
      onFormChange={() => {}}
      title={entityIdentifier as string}
    >
      {isLoading || !data.length ? (
        <Loading />
      ) : (
        <FormBuilder
          currentScope={currentScope}
          defaultScope={defaultScope}
          entityId={entityId}
          entityName={entityName}
          entityNamePlural={entityNamePlural}
          formData={data[0]}
          onSubmit={saveEntity}
          ref={ref}
          schema={schema}
          setIsDirty={setFormIsDirty}
        />
      )}
    </DrawerModal>
  );
}
