'use client';

import { find, propEq } from 'ramda';
import type { Table } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { gql } from '@apollo/client';
import { toast } from 'sonner';
import { Button } from '../ui/primitives/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/primitives/select';
import { useDispatch } from '../entities/actions-context';
import { useAppContext, useAppDispatch } from '../core/app-context';
import { useConfig } from '../core/config/config-context';
import type { SingleProject } from '../core/config/types';
import { DataTableViewOptions } from './data-table-view-options';
import { useEntityMutation } from '../graphql-client/use-entity-mutation';
import { getEntityDeleteMutation } from '../graphql-client/queries';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ entityName, table }: DataTableToolbarProps<TData>): JSX.Element {
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const appContext = useAppContext();
  const { projects, currentProjectId } = useConfig();
  const { scopes } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const [runMutation, setMutation, setOptions] = useEntityMutation();

  // Collect selected entity ids from the table
  // @ts-expect-error -- the DataGrid's original type doesn't know about the _id property
  const selectedIds: string[] = table.getSelectedRowModel().rows.map((row) => row.original._id as string);

  function handleCreate(): void {
    actionDispatch({ type: 'AddEntity', payload: { entityName } });
  }

  function handleScopeChange(value: string): void {
    appDispatch({ type: 'setScope', payload: { projectId: currentProjectId, scope: value } });
  }

  async function deleteOne(_id: string): Promise<void> {
    const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
    const mutation = getEntityDeleteMutation(entityName, schema, _id);

    await new Promise<void>((resolve) => {
      setMutation(gql`
        ${mutation}
      `);

      setOptions({
        variables: { where: { _id } },
        update(cache: { evict: (arg0: { id: string }) => void }) {
          cache.evict({ id: _id });
        },
        onCompleted: () => {
          resolve();
        },
      });

      runMutation(true);
    });
  }

  function handleBatchDelete(): void {
    const itemLabel = entityName === '_image' ? 'image' : entityName.toLowerCase();

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
          dialogActionSubmit: async () => {
            try {
              for (const id of selectedIds) {
                // eslint-disable-next-line no-await-in-loop
                await deleteOne(id);
              }

              table.resetRowSelection();

              toast.success(selectedIds.length > 1 ? 'Items successfully deleted.' : 'Item successfully deleted.');
            } catch {
              toast.error('Failed to delete selected items.');
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
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">
        {scopes && scopes.length > 0 ? (
          <Select
            defaultValue={appContext.scope}
            onValueChange={(value) => {
              handleScopeChange(value);
            }}
            value={appContext.scope}
          >
            <SelectTrigger className="fk-w-[12rem] fk-h-8" id="project">
              <span className="fk-text-muted-foreground">Scope:</span>
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
      </div>
      {selectedIds.length > 0 ? (
        <Button className="fk-h-8 fk-mr-2 lg:fk-flex" onClick={handleBatchDelete} size="sm" variant="destructive">
          <Trash2 className="fk-mr-2 fk-h-4 fk-w-4" /> Delete ({selectedIds.length})
        </Button>
      ) : null}
      <Button className="fk-ml-auto fk-h-8 lg:fk-flex" onClick={handleCreate} size="sm" variant="default">
        Create
      </Button>
    </div>
  );
}
