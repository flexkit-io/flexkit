'use client';

import { FilePlayIcon, ImageIcon, ImagePlayIcon, LayersIcon, SplinePointerIcon, X as ResetIcon } from 'lucide-react';
import type { ReactTable } from '@flexkit/studio';
import { Button, Input } from '@flexkit/studio/ui';
import { DataTableFacetedFilter, useParams, useUploadAssets } from '@flexkit/studio';

interface DataTableToolbarProps<TData> {
  entityName: string;
  table: ReactTable<TData>;
}

const mimeTypes = [
  {
    value: 'image/gif',
    label: 'GIF',
    icon: ImagePlayIcon,
  },
  {
    value: 'image/jpeg',
    label: 'JPEG',
    icon: ImageIcon,
  },
  {
    value: 'video/mp4',
    label: 'MP4',
    icon: FilePlayIcon,
  },
  {
    value: 'image/png',
    label: 'PNG',
    icon: LayersIcon,
  },
  {
    value: 'image/svg+xml',
    label: 'SVG',
    icon: SplinePointerIcon,
  },
  {
    value: 'image/webp',
    label: 'WebP',
    icon: ImageIcon,
  },
];

export function DataTableToolbar<TData>({ entityName, table }: DataTableToolbarProps<TData>): JSX.Element {
  const isFiltered = table.getState().columnFilters.length > 0;
  const { projectId } = useParams();
  const uploadAssets = useUploadAssets();

  async function handleUpload(): Promise<void> {
    await uploadAssets({ projectId, accept: 'image/*', multiple: true, maxBytes: 4 * 1024 * 1024 });
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
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="fk-h-8 fk-px-2 lg:fk-px-3">
            Reset
            <ResetIcon className="fk-ml-2 fk-h-4 fk-w-4" />
          </Button>
        )}
      </div>
      <Button className="fk-ml-auto fk-h-8 lg:fk-flex" onClick={handleUpload} size="sm" variant="default">
        Upload assets
      </Button>
    </div>
  );
}
