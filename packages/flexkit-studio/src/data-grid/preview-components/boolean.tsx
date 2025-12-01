import { CircleCheck, CircleX } from 'lucide-react';

export function Boolean({ value }: { value: boolean }) {
  return (
    <div className="fk-flex fk-w-full fk-justify-center">
      {value ? (
        <CircleCheck className="fk-w-4 fk-h-4 fk-text-emerald-500" />
      ) : (
        <CircleX className="fk-w-4 fk-h-4 fk-text-muted-foreground" />
      )}
    </div>
  );
}
