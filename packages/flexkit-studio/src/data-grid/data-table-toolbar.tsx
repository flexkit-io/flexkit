'use client';

import { useState } from 'react';
import type { JSX } from 'react';
import { find, propEq } from 'ramda';
import type { Table } from '@tanstack/react-table';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { toast } from 'sonner';
import { Button } from '../ui/primitives/button';
import { PermissionTooltip } from '../ui/components/permission-tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/primitives/select';
import { useDispatch } from '../entities/actions-context';
import { useAppContext, useAppDispatch } from '../core/app-context';
import { useCanMutate } from '../core/permissions';
import { useConfig } from '../core/config/config-context';
import type { SingleProject } from '../core/config/types';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTableSortedBy } from './data-table-sorted-by';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import { getEntityDeleteMutation, getEntityDeleteWhere } from '../graphql-client/queries';
import { getEntityListQueryName, scheduleEntityListRemoval } from '../graphql-client/refetch-entity-lists';

interface DataTableToolbarProps<TData> {
  entityName: string;
  isReloading?: boolean;
  onReload?: () => void;
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  entityName,
  isReloading = false,
  onReload,
  table,
}: DataTableToolbarProps<TData>): JSX.Element {
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const appContext = useAppContext();
  const apolloClient = useApolloClient();
  const { projects, currentProjectId } = useConfig();
  const { schema, scopes } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const [runMutation, setMutation, setOptions] = useEntityMutation();
  const [isDeleting, setIsDeleting] = useState(false);
  const canMutate = useCanMutate();

  // Collect selected entity ids from the table
  // @ts-expect-error -- the DataGrid's original type doesn't know about the _id property
  const selectedIds: string[] = table.getSelectedRowModel().rows.map((row) => row.original._id as string);

  function handleCreate(): void {
    actionDispatch({ type: 'AddEntity', payload: { entityName } });
  }

  function handleScopeChange(value: string): void {
    appDispatch({ type: 'setScope', payload: { projectId: currentProjectId, scope: value } });
  }

  async function deleteSelected(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const mutation = getEntityDeleteMutation(entityName, schema, ids);

    await new Promise<void>((resolve, reject) => {
      setMutation(gql`
        ${mutation}
      `);

      setOptions({
        variables: { where: getEntityDeleteWhere(ids) },
        update(cache: { evict: (arg0: { id: string }) => void }) {
          for (const id of ids) {
            cache.evict({ id });
          }
        },
        onCompleted: () => {
          resolve();
        },
        onError: (error: Error) => {
          reject(error);
        },
      });

      runMutation(true);
    });
  }

  function handleBatchDelete(): void {
    const itemLabel = entityName === '_asset' ? 'asset' : entityName.toLowerCase();

    actionDispatch({
      type: 'AlertDialog',
      payload: {
        options: {
          dialogTitle: `Delete ${selectedIds.length} ${itemLabel}${selectedIds.length > 1 ? 's' : ''}`,
          dialogMessage:
            selectedIds.length > 1
              ? `Are you sure you want to delete the selected ${itemLabel}s? They will be deleted permanently.`
              : `Are you sure you want to delete the selected ${itemLabel}? The item will be deleted permanently.`,
          dialogCancelTitle: 'Cancel',
          dialogActionLabel: 'Delete',
          isDestructive: true,
          dialogActionSubmit: async () => {
            setIsDeleting(true);

            try {
              const idsToDelete = [...selectedIds];

              await deleteSelected(idsToDelete);

              table.resetRowSelection();
              // Drop rows immediately, then soft-refetch counts/pages.
              await scheduleEntityListRemoval(
                apolloClient,
                getEntityListQueryName(entityName, schema),
                idsToDelete
              );
              toast.success(idsToDelete.length > 1 ? 'Items successfully deleted.' : 'Item successfully deleted.');
            } catch {
              toast.error('Failed to delete selected items.');
            } finally {
              setIsDeleting(false);
            }
          },
          dialogActionCancel: () => {
            // no-op
          },
        },
      },
    });
  }

  return (
    <div className="fk:flex fk:items-center fk:justify-between">
      <div className="fk:flex fk:flex-1 fk:items-center fk:space-x-2">
        {scopes && scopes.length > 0 ? (
          <Select
            defaultValue={appContext.scope}
            onValueChange={(value) => {
              handleScopeChange(value);
            }}
            value={appContext.scope}
          >
            <SelectTrigger className="fk:w-48!" id="project" size="sm">
              <span className="fk:text-muted-foreground">Scope:</span>
              <SelectValue>
                {
                  ((find(propEq(appContext.scope ?? '', 'name'))(scopes) as { name: string; label: string }) || null)
                    ?.label
                }
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
        <DataTableViewOptions table={table} />
        {onReload ? (
          <Button
            aria-label="Reload"
            className="fk:h-8"
            disabled={isDeleting || isReloading}
            onClick={onReload}
            size="icon-sm"
            variant="outline"
          >
            <RefreshCw className={isReloading ? 'fk:animate-spin' : undefined} />
          </Button>
        ) : null}
        <DataTableSortedBy table={table} />
      </div>
      {selectedIds.length > 0 ? (
        <PermissionTooltip disabled={!canMutate}>
          <Button
            className="fk:h-8 fk:mr-2 fk:lg:flex"
            disabled={isDeleting || !canMutate}
            onClick={handleBatchDelete}
            size="sm"
            variant="destructive"
          >
            {isDeleting ? (
              <Loader2 className="fk:mr-2 fk:h-4 fk:w-4 fk:animate-spin" />
            ) : (
              <Trash2 className="fk:mr-2 fk:h-4 fk:w-4" />
            )}
            Delete ({selectedIds.length})
          </Button>
        </PermissionTooltip>
      ) : null}
      <PermissionTooltip disabled={!canMutate}>
        <Button
          className="fk:ml-auto fk:h-8 fk:lg:flex"
          disabled={isDeleting || !canMutate}
          onClick={handleCreate}
          size="sm"
          variant="default"
        >
          Create
        </Button>
      </PermissionTooltip>
    </div>
  );
}
