import { useParams } from '@flexkit/studio';

export function EditEntity() {
  const { entity, id } = useParams();

  return (
    <div className="flex flex-col">
      Edit {entity} with id: {id}
    </div>
  );
}
