'use client';

import {
  ArrowDown as ArrowDownIcon,
  ArrowRight as ArrowRightIcon,
  ArrowUp as ArrowUpIcon,
  Circle as CircleIcon,
  CircleHelp as QuestionMarkCircledIcon,
  CircleGauge as StopwatchIcon,
  CircleCheck as CheckCircledIcon,
  CircleX as CrossCircledIcon,
  X as ResetIcon,
} from 'lucide-react';
import type { ReactTable } from '@flexkit/studio';
import { Button, Input } from '@flexkit/studio/ui';
import { DataTableFacetedFilter, useDispatch } from '@flexkit/studio';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: ReactTable<TData>;
}

const mimeTypes = [
  {
    value: 'image/jpeg',
    label: 'JPEG',
    icon: QuestionMarkCircledIcon,
  },
  {
    value: 'image/png',
    label: 'PNG',
    icon: CircleIcon,
  },
  {
    value: 'image/gif',
    label: 'GIF',
    icon: StopwatchIcon,
  },
  {
    value: 'image/webp',
    label: 'WebP',
    icon: CheckCircledIcon,
  },
  {
    value: 'video/mp4',
    label: 'MP4',
    icon: CrossCircledIcon,
  },
];

const priorities = [
  {
    label: 'Low',
    value: 'low',
    icon: ArrowDownIcon,
  },
  {
    label: 'Medium',
    value: 'medium',
    icon: ArrowRightIcon,
  },
  {
    label: 'High',
    value: 'high',
    icon: ArrowUpIcon,
  },
];

export function DataTableToolbar<TData>({ entityName, table }: DataTableToolbarProps<TData>): JSX.Element {
  const actionDispatch = useDispatch();
  const isFiltered = table.getState().columnFilters.length > 0;

  function handleCreate(): void {
    actionDispatch({ type: 'AddEntity', payload: { entityName } });
  }

  return (
    <div className="fk-flex fk-items-center fk-justify-between">
      <div className="fk-flex fk-flex-1 fk-items-center fk-space-x-2">
        <Input
          placeholder="Filter tasks..."
          // value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
          // onChange={(event) => table.getColumn('title')?.setFilterValue(event.target.value)}
          className="fk-h-8 fk-w-[150px] lg:fk-w-[250px]"
        />
        {table.getColumn('mimeType') && (
          <DataTableFacetedFilter column={table.getColumn('mimeType')} title="File type" options={mimeTypes} />
        )}
        {/* {table.getColumn('priority') && (
          <DataTableFacetedFilter column={table.getColumn('priority')} title="Priority" options={priorities} />
        )} */}
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="fk-h-8 fk-px-2 lg:fk-px-3">
            Reset
            <ResetIcon className="fk-ml-2 fk-h-4 fk-w-4" />
          </Button>
        )}
      </div>
      <Button className="fk-ml-auto fk-h-8 lg:fk-flex" onClick={handleCreate} size="sm" variant="default">
        Upload assets
      </Button>
    </div>
  );
}
