import { format } from 'date-fns';

export function DateTime({ value }: { value: string | object | unknown[] }) {
  const displayValue =
    value === 'null' || value === undefined || value === ''
      ? ''
      : format(new Date(value as string), 'PPP') + ' at ' + format(new Date(value as string), 'HH:mm');

  return <div className="fk-truncate">{displayValue}</div>;
}
