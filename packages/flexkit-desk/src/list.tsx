import { useCallback } from 'react';
import { find, propEq } from 'ramda';
import {
  getEntitySchema,
  useAppContext,
  useConfig,
  useLocation,
  useParams,
  Outlet,
  useEntityQuery,
} from '@flexkit/studio';
import {
  Skeleton,
  SidebarTrigger,
  Separator,
  useSidebar,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@flexkit/studio/ui';
import type { ColumnDef, SingleProject, Row } from '@flexkit/studio';
import { DataTable, DataTableRowActions, DataTableToolbar, useGridColumnsDefinition } from '@flexkit/studio/data-grid';

const pageSize = 25;

export function List(): JSX.Element {
  const { entity: entityName } = useParams();
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const entityId = query.get('id');
  const { scope } = useAppContext();
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = getEntitySchema(schema, entityName ?? '');
  const columnsDefinition = useGridColumnsDefinition({
    attributesSchema: entitySchema?.attributes ?? [],
    actionsComponent: (row) =>
      dataRowActions({ entityName: entitySchema?.name ?? '', entityNamePlural: entityName ?? '', row }),
  });
  const { setOpen } = useSidebar();

  const variables = entityId ? { where: { _id: entityId } } : { options: { offset: 0, limit: pageSize } };

  const { isLoading, fetchMore, count, data } = useEntityQuery({
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

  return (
    <div className="fk-flex fk-flex-col fk-h-full fk-px-4 fk-py-3">
      <div className="fk-flex fk-items-center fk-mb-4 fk-gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="-fk-ml-1 fk-w-4 fk-h-4" />
          </TooltipTrigger>
          <TooltipContent>Toggle Sidebar</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="fk-h-4" />
        <h2 className="fk-text-lg fk-font-semibold fk-leading-none fk-tracking-tight">
          {capitalize(entitySchema?.plural ?? '')}
        </h2>
      </div>
      <DataTable
        columns={isLoading ? loadingColumns : columnsDefinition}
        data={isLoading ? loadingData : (data ?? [])}
        entityName={entitySchema?.name ?? ''}
        pageSize={pageSize}
        onScroll={(e) => {
          fetchMoreOnBottomReached(e.target as HTMLDivElement);
        }}
        toolbarComponent={(table) => <DataTableToolbar entityName={entitySchema?.name ?? ''} table={table} />}
      />
      <Outlet />
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

type AttributeValue = {
  _id: string;
  [key: string]: string | AttributeValue | null;
  __typename: string;
};

type DataRowActions = {
  entityName: string;
  entityNamePlural: string;
  row: Row<AttributeValue>;
};

function dataRowActions({ entityName, entityNamePlural, row }: DataRowActions): JSX.Element {
  return <DataTableRowActions entityName={entityName} entityNamePlural={entityNamePlural} row={row} />;
}

function getLoadingColumns(columns: object[]): ColumnDef<AttributeValue>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk-h-4 fk-w-full" style={{ marginTop: '7px', marginBottom: '6px' }} />,
  })) as unknown as ColumnDef<AttributeValue>[];
}
