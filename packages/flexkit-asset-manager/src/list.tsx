import { useCallback, useMemo, useState } from 'react';
import { find, propEq } from 'ramda';
import {
  assetSchema,
  DataTable,
  useAppContext,
  useConfig,
  useLocation,
  Outlet,
  useEntityQuery,
  ProjectDisabled,
  SchemaError,
  useGridColumnsDefinition,
} from '@flexkit/studio';
import { Skeleton } from '@flexkit/studio/ui';
import type { ColumnDef, SingleProject } from '@flexkit/studio';
import { DataTableToolbar } from './data-grid/data-table-toolbar';

const pageSize = 25;

export function List(): JSX.Element {
  const entityName = '_assets';
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const entityId = query.get('id');
  const { scope } = useAppContext();
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const columnsDefinition = useGridColumnsDefinition({
    attributesSchema: assetSchema.attributes,
    checkboxSelect: 'multiple',
  });

  const [searchWhere, setSearchWhere] = useState<Record<string, unknown>>({});

  const whereBase = entityId ? { _id: entityId } : { NOT: { path: null } };
  const where = useMemo(() => {
    if (!searchWhere || Object.keys(searchWhere).length === 0) {
      return whereBase;
    }

    if (entityId) {
      return whereBase; // ignore search when a single asset is selected via id
    }

    return { AND: [whereBase, searchWhere] } as Record<string, unknown>;
  }, [entityId, searchWhere]);

  const variables = { where, options: { offset: 0, limit: pageSize, sort: [{ _updatedAt: 'DESC' }] } };

  const { isLoading, fetchMore, count, data, isProjectDisabled } = useEntityQuery({
    entityNamePlural: entityName ?? '',
    schema,
    scope,
    variables,
  });

  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      const rowsCount = data?.length ?? 0;

      if (containerRefElement && count > 0 && rowsCount > 0) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (scrollHeight - scrollTop - clientHeight < 500 && !isLoading && rowsCount < count) {
          fetchMore({
            variables: {
              options: {
                offset: data?.length ?? 0,
                limit: pageSize,
              },
            },
          });
        }
      }
    },
    [count, data?.length, fetchMore, isLoading]
  );

  const loadingData = Array(pageSize).fill({});
  const loadingColumns = getLoadingColumns(columnsDefinition);

  if (isProjectDisabled) {
    return (
      <div className="fk-flex fk-flex-col fk-h-full fk-pl-3">
        <ProjectDisabled />
      </div>
    );
  }

  return (
    <div className="fk-flex fk-flex-col fk-h-full fk-pl-3">
      <SchemaError />
      <h2 className="fk-mb-4 fk-text-lg fk-font-semibold fk-leading-none fk-tracking-tight">Asset Manager</h2>
      <DataTable
        classNames={{ row: 'fk-h-20' }}
        columns={isLoading ? loadingColumns : columnsDefinition}
        data={isLoading ? loadingData : (data ?? [])}
        entityName={assetSchema.name}
        pageSize={pageSize}
        onScroll={(e) => {
          fetchMoreOnBottomReached(e.target as HTMLDivElement);
        }}
        toolbarComponent={(table) => (
          <DataTableToolbar
            entityName={assetSchema.name}
            table={table}
            onSearchWhereChange={(w) => setSearchWhere(w)}
          />
        )}
      />
      <Outlet />
    </div>
  );
}

type AttributeValue = {
  _id: string;
  [key: string]: string | AttributeValue | null;
  __typename: string;
};

function getLoadingColumns(columns: object[]): ColumnDef<AttributeValue>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk-h-4 fk-w-full" style={{ marginTop: '7px', marginBottom: '6px' }} />,
  })) as unknown as ColumnDef<AttributeValue>[];
}
