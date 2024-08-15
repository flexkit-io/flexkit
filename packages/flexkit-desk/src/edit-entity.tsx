import { useParams } from '@flexkit/studio';

export function EditEntity(): JSX.Element {
  const { entity, id } = useParams();

  // Not used, left here as an example of how to nest routes in plugins (see ./index.tsx file)
  return (
    <div className="flex flex-col">
      Edit {entity} with id: {id}
    </div>
  );
}
