'use client';

import { find, propEq } from 'ramda';
import type { Table } from '@tanstack/react-table';
import { Button } from '../ui/primitives/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/primitives/select';
import { useDispatch } from '../entities/actions-context';
import { useAppContext, useAppDispatch } from '../core/app-context';
import { useConfig } from '../core/config/config-context';
import type { SingleProject } from '../core/config/types';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ entityName, table }: DataTableToolbarProps<TData>): JSX.Element {
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { scope } = useAppContext();
  const { projects, currentProjectId } = useConfig();
  const { scopes } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;

  function handleCreate(): void {
    actionDispatch({ type: 'AddEntity', payload: { entityName } });
  }

  function handleScopeChange(value: string): void {
    appDispatch({ type: 'setScope', payload: value });
  }

  return (
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">
        {scopes && scopes.length > 0 ? (
          <Select
            defaultValue={scope}
            onValueChange={(value) => {
              handleScopeChange(value);
            }}
          >
            <SelectTrigger className="fk-w-[12rem] fk-h-8" id="project">
              <span className="fk-text-muted-foreground">Scope:</span>
              <SelectValue>
                {(find(propEq(scope, 'name'))(scopes) as { name: string; label: string }).label}
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
      <Button className="fk-ml-auto fk-h-8 lg:fk-flex" onClick={handleCreate} size="sm" variant="default">
        Create
      </Button>
    </div>
  );
}
