import { format, isValid } from 'date-fns';
import { CopyableTruncatedText } from './copyable-truncated-text';

export function DateTime({ value }: { value: string | object | unknown[] }) {
  if (value === null || value === undefined || value === '' || typeof value !== 'string') {
    return <CopyableTruncatedText value="" />;
  }

  const date = new Date(value);

  if (!isValid(date)) {
    return <CopyableTruncatedText value="" />;
  }

  const displayValue = format(date, 'MMM d, yyyy') + ' at ' + format(date, 'HH:mm');

  return <CopyableTruncatedText value={displayValue} />;
}
