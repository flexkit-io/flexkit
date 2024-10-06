import { CircleCheckBig, CircleX } from 'lucide-react';

export function CustomBooleanPreviewField(value: boolean): JSX.Element {
  return (
    <div className="fk-flex fk-w-full fk-justify-center">
      {value ? (
        <CircleCheckBig className="fk-w-4 fk-h-4 fk-text-green-500" />
      ) : (
        <CircleX className="fk-w-4 fk-h-4 fk-text-muted-foreground" />
      )}
    </div>
  );
}
