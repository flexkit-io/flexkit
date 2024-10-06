import { useCallback, useMemo } from 'react';
import { find, propEq } from 'ramda';
import { useAppContext, useConfig, useLocation, useParams, Outlet, useEntityQuery } from '@flexkit/studio';
import { Skeleton } from '@flexkit/studio/ui';
import type { ColumnDef, Entity, SingleProject, Row } from '@flexkit/studio';
import { DataTable, DataTableRowActions, useGridColumnsDefinition } from '@flexkit/studio/data-grid';

const pageSize = 25;

export function List(): JSX.Element {
  const { entity: entityName } = useParams();
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const entityId = query.get('id');
  const { scope } = useAppContext();
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entityName, 'plural'))(schema) as Entity | undefined;
  const columnsDefinition = useGridColumnsDefinition({
    attributesSchema: entitySchema?.attributes ?? [],
    actionsComponent: (row) =>
      dataRowActions({ entityName: entitySchema?.name ?? '', entityNamePlural: entityName ?? '', row }),
  });

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
    <div className="fk-flex fk-flex-col fk-h-full">
      <h2 className="fk-mb-4 fk-text-lg fk-font-semibold fk-leading-none fk-tracking-tight">
        {capitalize(entitySchema?.plural ?? '')}
      </h2>
      <DataTable
        columns={isLoading ? loadingColumns : columnsDefinition}
        data={isLoading ? loadingData : (data ?? [])}
        entityName={entitySchema?.name ?? ''}
        hasToolbar
        pageSize={pageSize}
        onScroll={(e) => {
          fetchMoreOnBottomReached(e.target as HTMLDivElement);
        }}
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
    cell: () => <Skeleton className="fk-h-4 fk-w-full" />,
  })) as unknown as ColumnDef<AttributeValue>[];
}
