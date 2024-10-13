'use client';

import { Button, Input, ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@flexkit/studio/ui';
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
import { Sidebar } from './sidebar';
import { DataTableFacetedFilter } from '@flexkit/studio';

const statuses = [
  {
    value: 'backlog',
    label: 'Backlog',
    icon: QuestionMarkCircledIcon,
  },
  {
    value: 'todo',
    label: 'Todo',
    icon: CircleIcon,
  },
  {
    value: 'in progress',
    label: 'In Progress',
    icon: StopwatchIcon,
  },
  {
    value: 'done',
    label: 'Done',
    icon: CheckCircledIcon,
  },
  {
    value: 'canceled',
    label: 'Canceled',
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

export function Root(): JSX.Element {
  const table = {
    getColumn: (name: string): boolean => true,
    getState: () => ({ columnFilters: [] }),
    resetColumnFilters: () => {},
  };
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <ResizablePanelGroup direction="horizontal" className="fk-h-full">
      <ResizablePanel className="fk-p-3" defaultSize={82}>
        <div className="fk-flex fk-flex-col">
          {/* <div className="flex flex-1 items-center space-x-2">
            <Input
              placeholder="Filter tasks..."
              // value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
              // onChange={(event) => table.getColumn('title')?.setFilterValue(event.target.value)}
              className="h-8 w-[150px] lg:w-[250px]"
            />
            {table.getColumn('status') && (
              <DataTableFacetedFilter column={table.getColumn('status')} title="Status" options={statuses} />
            )}
            {table.getColumn('priority') && (
              <DataTableFacetedFilter column={table.getColumn('priority')} title="Priority" options={priorities} />
            )}
            {isFiltered && (
              <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
                Reset
                <ResetIcon className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div> */}
        </div>
      </ResizablePanel>
      <ResizableHandle className="hover:fk-bg-blue-500 fk-transition-colors" withHandle />
      <ResizablePanel defaultSize={18} minSize={10}>
        <div className="sm:fk-hidden md:fk-block">
          <Sidebar />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
