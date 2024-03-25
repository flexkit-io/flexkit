import { find, propEq } from 'ramda';
import { useConfig, useParams, Outlet, Skeleton, useEntityQuery, type Entity } from '@flexkit/studio';
import type { SingleProject } from '@flexkit/studio';
import { DataTable, gridColumnsDefinition } from '@flexkit/studio/data-grid';

const page = 0; // TODO: temporary placeholder, this value must be managed by the data grid
const pageSize = 20; // TODO: this should be obtained from a global state persisted somewehere

export function List() {
  const { entity } = useParams();
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entity, 'plural'))(schema) as Entity | undefined;
  const columnsDefinition = gridColumnsDefinition({
    entityName: entitySchema?.name ?? '',
    entityNamePlural: entity ?? '',
    attributesSchema: entitySchema?.attributes || [],
    hasActions: true,
  });
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
  console.log(loadingColumns);

  return (
    <div className="fk-flex fk-flex-col">
      <h2 className="fk-mb-4 fk-text-lg fk-font-semibold fk-leading-none fk-tracking-tight">
        {capitalize(entitySchema?.plural ?? '')}
      </h2>
      <DataTable
        columns={loading ? loadingColumns : columnsDefinition}
        data={loading ? loadingData : results}
        entityName={entitySchema?.name || ''}
      />
      <Outlet />
    </div>
  );
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
