import { useAuth, useParams, Outlet, useEntityQuery } from '@flexkit/studio';

const page = 1; // TODO: temporary placeholder, this value must be managed by the data grid
const pageSize = 20; // TODO: this should be obtained from a global state persisted somewehere

export function List() {
  const { entity } = useParams();
  const [, { projectConfig }] = useAuth();
  const [loading, { count, results }] = useEntityQuery({
    entityNamePlural: entity ?? '',
    jsonSchema: projectConfig?.jsonSchema || [],
    scope: 'default', // TODO: this should be obtained from a global state persisted somewehere
    variables: { options: { offset: page * pageSize, limit: pageSize } },
  });

  return (
    <div className="flex flex-col">
      {loading && <div>Loading...</div>}
      {entity}
      Count: {count}
      Results: {JSON.stringify(results)}
      <Outlet />
    </div>
  );
}
