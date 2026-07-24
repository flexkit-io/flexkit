import { format, isValid } from 'date-fns';

export function DateTime({ value }: { value: string | object | unknown[] }) {
  if (value === null || value === undefined || value === '' || typeof value !== 'string') {
    return <div className="fk:truncate" />;
  }

  const date = new Date(value);

  if (!isValid(date)) {
    return <div className="fk:truncate" />;
  }

  const displayValue = format(date, 'MMM d, yyyy') + ' at ' + format(date, 'HH:mm');

  return <div className="fk:truncate">{displayValue}</div>;
}
