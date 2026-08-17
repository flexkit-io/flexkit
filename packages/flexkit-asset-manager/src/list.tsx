import { useCallback, useMemo, useState, type JSX } from 'react';
import { find, propEq } from 'ramda';
import {
  assetSchema,
  DataTable,
  useAppContext,
  useConfig,
  useLocation,
  Outlet,
  useEntityQuery,
  useGraphQLError,
  ProjectDisabled,
  SchemaError,
  useGridColumnsDefinition,
} from '@flexkit/studio';
import { Skeleton } from '@flexkit/studio/ui';
import type { AttributeValue, ColumnDef, SingleProject, SortingState, Updater } from '@flexkit/studio';
import { AssetGrid } from './data-grid/asset-grid';
import { DataTableToolbar } from './data-grid/data-table-toolbar';
import { AssetRowActions } from './data-grid/asset-row-actions';
import { getStoredViewMode, setStoredViewMode, type AssetViewMode } from './data-grid/view-mode';

type WhereClause = { [key: string]: unknown };

const pageSize = 25;
const defaultSort = [{ _updatedAt: 'DESC' }, { _id: 'DESC' }];

export function List(): JSX.Element {
  const entityName = '_assets';
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const entityId = query.get('id');
  const { scope } = useAppContext();
  const { schemaErrorMessage } = useGraphQLError();
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [viewMode, setViewMode] = useState<AssetViewMode>(() => getStoredViewMode());
  const columnsDefinition = useGridColumnsDefinition<AttributeValue, unknown>({
    attributesSchema: assetSchema.attributes,
    actionsComponent: (row) => <AssetRowActions row={row} />,
    checkboxSelect: 'multiple',
    enableColumnSorting: true,
  });

  const [searchWhere, setSearchWhere] = useState<WhereClause>({});
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const where = useMemo(() => {
    const whereBase = entityId ? { _id: { eq: entityId } } : { NOT: { path: { eq: null } } };

    if (!searchWhere || Object.keys(searchWhere).length === 0) {
      return whereBase;
    }

    if (entityId) {
      return whereBase; // ignore search when a single asset is selected via id
    }

    return { AND: [whereBase, searchWhere] } as WhereClause;
  }, [entityId, searchWhere]);

  const graphqlSort = useMemo(() => {
    if (sorting.length === 0) {
      return defaultSort;
    }

    const primarySort = sorting.map(({ id, desc }) => ({ [id]: desc ? 'DESC' : 'ASC' }));
    const hasIdSort = primarySort.some((entry) => '_id' in entry);

    if (hasIdSort) {
      return primarySort;
    }

    // Tie-break so offset pages stay stable when sort values collide.
    return [...primarySort, { _id: 'DESC' }];
  }, [sorting]);

  const variables = useMemo(() => ({ where, offset: 0, limit: pageSize, sort: graphqlSort }), [where, graphqlSort]);

  function handleSortingChange(updater: Updater<SortingState>): void {
    setSorting(updater);
  }

  function handleViewModeChange(mode: AssetViewMode): void {
    setViewMode(mode);
    setStoredViewMode(mode);
  }

  const { isLoading, isLoadingMore, fetchMore, count, data, isProjectDisabled } = useEntityQuery({
    entityNamePlural: entityName ?? '',
    schema,
    scope,
    variables,
    selection: 'list',
  });

  const isInitialLoading = isSearchLoading || (isLoading && (data == null || data.length === 0));

  const rowsCount = data?.length ?? 0;
  const hasMore = !isSearchLoading && count > 0 && rowsCount > 0 && rowsCount < count;

  const handleLoadMore = useCallback(() => {
    fetchMore({
      variables: {
        // Offset is tracked inside useEntityQuery from page windows; value here is ignored.
        offset: 0,
        limit: pageSize,
      },
    });
  }, [fetchMore]);

  const loadingData = useMemo(
    () => Array.from({ length: pageSize }, (_, index) => ({ _id: `loading-${index}` }) as AttributeValue),
    []
  );
  const loadingColumns = useMemo(() => getLoadingColumns(columnsDefinition), [columnsDefinition]);

  if (isProjectDisabled) {
    return (
      <div className="fk:flex fk:flex-col fk:h-full fk:pl-3">
        <ProjectDisabled />
      </div>
    );
  }

  return (
    <div className="fk:flex fk:flex-col fk:h-full fk:pl-3">
      <SchemaError />
      <div className="fk:mb-4 fk:flex fk:items-center fk:gap-2 fk:pr-3">
        <h2 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">Asset Manager</h2>
        {!isInitialLoading ? (
          <span className="fk:ml-auto fk:text-sm fk:font-normal fk:text-muted-foreground">
            {count.toLocaleString()} {count === 1 ? 'record' : 'records'}
          </span>
        ) : null}
      </div>
      {!schemaErrorMessage && viewMode === 'list' ? (
        <DataTable
          classNames={{ row: 'fk:h-20' }}
          columns={isInitialLoading ? loadingColumns : columnsDefinition}
          data={isInitialLoading ? loadingData : ((data ?? []) as AttributeValue[])}
          entityName={assetSchema.name}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          pageSize={pageSize}
          sorting={sorting}
          onLoadMore={handleLoadMore}
          onSortingChange={handleSortingChange}
          toolbarComponent={(table) => (
            <DataTableToolbar
              entityName={assetSchema.name}
              table={table}
              viewMode={viewMode}
              onSearchLoadingChange={setIsSearchLoading}
              onSearchWhereChange={setSearchWhere}
              onViewModeChange={handleViewModeChange}
            />
          )}
        />
      ) : null}
      {!schemaErrorMessage && viewMode === 'grid' ? (
        <AssetGrid
          columns={columnsDefinition}
          data={isInitialLoading ? [] : ((data ?? []) as AttributeValue[])}
          entityName={assetSchema.name}
          hasMore={hasMore}
          isLoading={isInitialLoading}
          isLoadingMore={isLoadingMore}
          pageSize={pageSize}
          sorting={sorting}
          onLoadMore={handleLoadMore}
          onSortingChange={handleSortingChange}
          toolbarComponent={(table) => (
            <DataTableToolbar
              entityName={assetSchema.name}
              table={table}
              viewMode={viewMode}
              onSearchLoadingChange={setIsSearchLoading}
              onSearchWhereChange={setSearchWhere}
              onViewModeChange={handleViewModeChange}
            />
          )}
        />
      ) : null}
      <Outlet />
    </div>
  );
}

function getLoadingColumns(columns: ColumnDef<AttributeValue, unknown>[]): ColumnDef<AttributeValue, unknown>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk:h-4 fk:w-full" style={{ marginTop: '7px', marginBottom: '6px' }} />,
  }));
}
