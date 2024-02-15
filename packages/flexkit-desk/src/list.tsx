import { find, propEq } from 'ramda';
import { useAuth, useParams, Outlet, Skeleton, useEntityQuery } from '@flexkit/studio';
import type { Entity } from '@flexkit/studio';
import { gridColumnsDefinition } from './data-grid/columns';
import { DataTable } from './data-grid/data-table';

const page = 0; // TODO: temporary placeholder, this value must be managed by the data grid
const pageSize = 20; // TODO: this should be obtained from a global state persisted somewehere

export function List() {
  const { entity } = useParams();
  const [, { projectConfig }] = useAuth();
  const entitySchema = find(propEq(entity, 'plural'))(projectConfig?.jsonSchema || []) as Entity | undefined;
  const columnsDefinition = gridColumnsDefinition(entitySchema?.attributes || []);
  const [loading, { count, results }] = useEntityQuery({
    entityNamePlural: entity ?? '',
    jsonSchema: projectConfig?.jsonSchema || [],
    scope: 'default', // TODO: this should be obtained from a global state persisted somewehere
    variables: { options: { offset: page * pageSize, limit: pageSize } },
  });
  const loadingData = Array(5).fill({});
  const loadingColumns = columnsDefinition.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk-h-4 fk-w-full" />,
  }));

  return (
    <div className="fk-flex fk-flex-col">
      <DataTable data={loading ? loadingData : results} columns={loading ? loadingColumns : columnsDefinition} />
      <Outlet />
    </div>
  );
}
