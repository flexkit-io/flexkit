import { JSX } from 'react';
import { CircleCheckBig, CircleX } from 'lucide-react';

export function CustomBooleanPreviewField({ value }: { value: boolean }): JSX.Element {
  return (
    <div className="flex w-full justify-center">
      {value ? (
        <CircleCheckBig className="h-4 w-4 text-emerald-500" />
      ) : (
        <CircleX className="h-4 w-4 text-zinc-400" />
      )}
    </div>
  );
}
