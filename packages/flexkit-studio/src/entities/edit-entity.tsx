'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { find, propEq } from 'ramda';
import { toast } from 'sonner';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { useAppContext, useAppDispatch } from '../core/app-context';
import type { SingleProject } from '../core/config/types';
import DrawerModal from '../ui/components/drawer-modal';
import { useDrawerModalContext } from '../ui/drawer-modal-context';
import { useConfig } from '../core/config/config-context';
import { useEntityQuery } from '../graphql-client/use-entity-query';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import { getEntityListQueryName, scheduleEntityListRefetch } from '../graphql-client/refetch-entity-lists';
import { getEntityUpdateMutation, getLocalAttributeIdsFromUpdateResponse } from '../graphql-client/queries';
import type { FormEntityItem } from '../graphql-client/types';
import { ReadOnlyMode } from '../core/error/read-only-mode';
import FormBuilder from '../form/form-builder';
import type { SubmitHandle } from '../form/form-builder';
import { getDisplayAttribute } from '../core/get-display-attribute';
import type { Entity } from '../core/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/primitives/select';
import { useDispatch } from './actions-context';
import SaveButton from './save-button';
import Loading from './loading';
import { useAuth } from '../auth/auth-context';
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
  const apolloClient = useApolloClient();
  const [runMutation, setMutation, setOptions, mutationData] = useEntityMutation();
  const { isDirty, setIsDirty } = useDrawerModalContext();
  const [forceClose, setForceClose] = useState(false);
  const [, auth] = useAuth();

  const setFormIsDirty = useCallback(
    (nextIsDirty: boolean) => {
      setIsDirty(nextIsDirty);
    },
    [setIsDirty]
  );

  useEffect(() => {
    if (mutationData.error) {
      ref.current?.hasErrors();
    }
  }, [mutationData.error]);

  // Use the same dirty flag as the Save button. hasDataChanged() can stay true
  // after a successful save (stale formData baseline / relationship field noise).
  const handleBeforeClose = useCallback(() => {
    if (!isDirty) {
      return true;
    }

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
            setIsDirty(false);
            dispatch({ type: 'Dismiss', _id: 'unsavedChanges', payload: {} });
            setForceClose(true);
          },
        },
      },
    });

    return false;
  }, [dispatch, isDirty, setIsDirty]);

  const handleClose = useCallback(
    (_id: Action['_id']) => {
      dispatch({ type: 'Dismiss', _id, payload: {} });
    },
    [dispatch]
  );

  const handleSave = useCallback(() => {
    ref.current?.submit();
  }, [ref]);

  function handleScopeChange(nextScope: string): void {
    if (isDirty) {
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
              dispatch({ type: 'Dismiss', _id: 'unsavedChanges', payload: {} });
              setCurrentScope(nextScope);
              appDispatch({ type: 'setScope', payload: { projectId: currentProjectId, scope: nextScope } });
            },
          },
        },
      });

      return;
    }

    setCurrentScope(nextScope);
    appDispatch({ type: 'setScope', payload: { projectId: currentProjectId, scope: nextScope } });
  }

  const { isLoading, data: results } = useEntityQuery({
    entityNamePlural,
    schema,
    scope: currentScope,
    variables: { where: { _id: { eq: entityId } } },
    isForm: true,
  });

  const saveEntity = useCallback(
    (newData: FormEntityItem, previousData?: FormEntityItem) => {
      if (!previousData) {
        return;
      }

      const mutation = getEntityUpdateMutation(
        entityNamePlural,
        entityId,
        currentScope,
        schema,
        previousData,
        newData,
        {
          currentUser: auth.user,
        }
      );

      setMutation(gql`
        ${mutation}
      `);
      setOptions({
        variables: { where: { _id: { eq: entityId } } },
        onCompleted: (response: unknown) => {
          // Adopt _ids for any local nodes created on this save. A full form
          // refetch rewrites `values:` and re-dirties the drawer.
          ref.current?.applyLocalAttributeIds(
            getLocalAttributeIdsFromUpdateResponse(response, entityNamePlural, schema)
          );
          void scheduleEntityListRefetch(apolloClient, getEntityListQueryName(entityNamePlural, schema));
          toast.success('Your changes have been saved.');
        },
      });
      runMutation(true);
    },
    [apolloClient, auth.user, currentScope, entityId, entityNamePlural, runMutation, schema, setMutation, setOptions]
  );
  const data = results as FormEntityItem[];
  const hasData = data.length > 0;
  const isInitialLoading = isLoading && !hasData;

  function getEntityIdentifier(entitySchema: Entity, data: FormEntityItem[]): string {
    const displayAttribute = getDisplayAttribute(entitySchema);
    const displayAttributeName = displayAttribute?.name;
    const isRelationship = displayAttribute?.relationship?.field !== undefined;

    if (!data.length || !displayAttributeName) {
      return '';
    }

    if (!isRelationship || !displayAttribute?.relationship?.field) {
      return data[0][displayAttributeName]?.value as string;
    }

    const relatedValue = (data[0][displayAttributeName]?.value as Record<string, unknown> | undefined)?.[
      displayAttribute.relationship.field
    ];
    // The related entity's display field may be a local attribute, which is a
    // list relationship field holding 0..1 scoped nodes
    const relatedNode = Array.isArray(relatedValue) ? (relatedValue[0] as unknown) : relatedValue;

    if (relatedNode && typeof relatedNode === 'object') {
      const scopedNode = relatedNode as Record<string, unknown>;

      return (scopedNode[currentScope] ?? scopedNode.default ?? '') as string;
    }

    return (relatedNode ?? '') as string;
  }

  const entityIdentifier = hasData && entitySchema ? getEntityIdentifier(entitySchema, data) : '';

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
              <SelectTrigger className="fk:w-[12rem] fk:h-9" id="project">
                <span className="fk:text-muted-foreground">Scope:&nbsp;</span>
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
      forceClose={forceClose}
      isFocused={isFocused}
      onClose={() => {
        handleClose(action._id);
      }}
      onFormChange={() => {}}
      title={entityIdentifier as string}
    >
      {isInitialLoading || !hasData ? (
        <Loading />
      ) : (
        <>
          {mutationData.isProjectReadOnly ? <ReadOnlyMode /> : null}
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
        </>
      )}
    </DrawerModal>
  );
}
