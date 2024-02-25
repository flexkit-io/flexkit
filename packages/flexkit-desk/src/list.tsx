import { find, propEq } from 'ramda';
import { useConfig, useParams, Outlet, Skeleton, useEntityQuery, type Entity } from '@flexkit/studio';
import type { SingleProject } from '@flexkit/studio';
import { gridColumnsDefinition } from './data-grid/columns';
import { DataTable } from './data-grid/data-table';

const page = 0; // TODO: temporary placeholder, this value must be managed by the data grid
const pageSize = 20; // TODO: this should be obtained from a global state persisted somewehere

export function List() {
  const { entity } = useParams();
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entity, 'plural'))(schema) as Entity | undefined;
  const columnsDefinition = gridColumnsDefinition(entitySchema?.attributes || []);
  const [loading, { count, results }] = useEntityQuery({
    entityNamePlural: entity ?? '',
    schema,
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
      <h2 className="fk-mb-4 fk-text-lg fk-font-semibold fk-leading-none fk-tracking-tight">
        {capitalize(entitySchema?.plural ?? '')}
      </h2>
      <DataTable
        data={loading ? loadingData : results}
        columns={loading ? loadingColumns : columnsDefinition}
        entityName={entitySchema?.name || ''}
      />
      <Outlet />
    </div>
  );
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
