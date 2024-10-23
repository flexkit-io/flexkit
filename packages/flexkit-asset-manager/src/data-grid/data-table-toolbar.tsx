'use client';

import type { ReactTable } from '@flexkit/studio';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@flexkit/studio/ui';
import { useDispatch } from '@flexkit/studio';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: ReactTable<TData>;
}

export function DataTableToolbar<TData>({ entityName, table }: DataTableToolbarProps<TData>): JSX.Element {
  const actionDispatch = useDispatch();

  function handleCreate(): void {
    actionDispatch({ type: 'AddEntity', payload: { entityName } });
  }

  return (
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">Filters?</div>
      <Button className="fk-ml-auto fk-h-8 lg:fk-flex" onClick={handleCreate} size="sm" variant="default">
        Upload assets
      </Button>
    </div>
  );
}
