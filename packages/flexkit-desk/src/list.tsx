import { JSX, useCallback, useMemo, useState } from 'react';
import { find, propEq } from 'ramda';
import {
  getEntitySchema,
  useAppContext,
  useConfig,
  useLocation,
  useParams,
  Outlet,
  useEntityQuery,
  useGraphQLError,
  ProjectDisabled,
  SchemaError,
  DataTable,
  DataTableRowActions,
  DataTableToolbar,
  useGridColumnsDefinition,
} from '@flexkit/studio';
import { Skeleton, SidebarTrigger, Separator, Tooltip, TooltipContent, TooltipTrigger } from '@flexkit/studio/ui';
import type { AttributeValue, ColumnDef, SingleProject, Row, SortingState, Updater } from '@flexkit/studio';

const pageSize = 25;
const defaultSort = [{ _updatedAt: 'DESC' }];

export function List(): JSX.Element {
  const { entity: entityName } = useParams();
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const entityId = query.get('id');
  const { scope } = useAppContext();
  const { schemaErrorMessage } = useGraphQLError();
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = getEntitySchema(schema, entityName ?? '');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [scrollToTopKey, setScrollToTopKey] = useState(0);
  const [sortedEntityName, setSortedEntityName] = useState(entityName);

  if (entityName !== sortedEntityName) {
    setSortedEntityName(entityName);
    setSorting([]);
  }

  const columnsDefinition = useGridColumnsDefinition<AttributeValue, unknown>({
    attributesSchema: entitySchema?.attributes ?? [],
    actionsComponent: (row) =>
      dataRowActions({ entityName: entitySchema?.name ?? '', entityNamePlural: entityName ?? '', row }),
    checkboxSelect: 'multiple',
    enableColumnSorting: true,
  });

  const graphqlSort = useMemo(() => {
    if (sorting.length === 0) {
      return defaultSort;
    }

    return sorting.map(({ id, desc }) => ({ [id]: desc ? 'DESC' : 'ASC' }));
  }, [sorting]);

  const variables = entityId
    ? { where: { _id: { eq: entityId } } }
    : {
        offset: 0,
        limit: pageSize,
        sort: graphqlSort,
      };

  const { isLoading, isLoadingMore, fetchMore, reload, count, data, isProjectDisabled } = useEntityQuery({
    entityNamePlural: entityName ?? '',
    schema,
    scope,
    variables,
    selection: 'list',
  });

  function handleSortingChange(updater: Updater<SortingState>): void {
    setSorting(updater);
  }

  const rowsCount = data?.length ?? 0;
  const hasMore = count > 0 && rowsCount > 0 && rowsCount < count;

  const handleLoadMore = useCallback(() => {
    fetchMore({
      variables: {
        offset: rowsCount,
        limit: pageSize,
      },
    });
  }, [fetchMore, rowsCount]);

  const handleReload = useCallback(() => {
    setScrollToTopKey((key) => key + 1);
    reload();
  }, [reload]);

  const loadingData = Array(pageSize).fill({});
  const loadingColumns = getLoadingColumns(columnsDefinition);
  const isInitialLoading = isLoading && (data == null || data.length === 0);

  if (isProjectDisabled) {
    return (
      <div className="fk:flex fk:flex-col fk:h-full fk:px-4 fk:pt-3">
        <ProjectDisabled />
      </div>
    );
  }

  return (
    <div className="fk:flex fk:flex-col fk:h-full fk:px-4 fk:pt-3">
      <SchemaError />
      <div className="fk:flex fk:items-center fk:mb-4 fk:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fk:-ml-1 fk:w-4 fk:h-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk:h-4" />
        <h2 className="fk:text-lg fk:font-semibold fk:leading-none fk:tracking-tight">
          {capitalize(entitySchema?.menu?.label ?? entitySchema?.plural ?? '')}
        </h2>
        {!isInitialLoading ? (
          <span className="fk:ml-auto fk:text-sm fk:font-normal fk:text-muted-foreground">
            {count.toLocaleString()} {count === 1 ? 'record' : 'records'}
          </span>
        ) : null}
      </div>
      {!schemaErrorMessage ? (
        <DataTable
          columns={isInitialLoading ? loadingColumns : columnsDefinition}
          data={isInitialLoading ? loadingData : (data ?? [])}
          entityName={entitySchema?.name ?? ''}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          pageSize={pageSize}
          scrollToTopKey={scrollToTopKey}
          sorting={sorting}
          onLoadMore={handleLoadMore}
          onSortingChange={handleSortingChange}
          toolbarComponent={(table) => (
            <DataTableToolbar
              entityName={entitySchema?.name ?? ''}
              isReloading={isInitialLoading}
              onReload={handleReload}
              table={table}
            />
          )}
        />
      ) : null}
      <Outlet />
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

type DataRowActions = {
  entityName: string;
  entityNamePlural: string;
  row: Row<AttributeValue>;
};

function dataRowActions({ entityName, entityNamePlural, row }: DataRowActions): JSX.Element {
  return <DataTableRowActions entityName={entityName} entityNamePlural={entityNamePlural} row={row} />;
}

function getLoadingColumns(columns: ColumnDef<AttributeValue, unknown>[]): ColumnDef<AttributeValue, unknown>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk:h-4 fk:w-full" style={{ marginTop: '7px', marginBottom: '6px' }} />,
  }));
}
