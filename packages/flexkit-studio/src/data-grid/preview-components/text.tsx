import { CopyableTruncatedText } from './copyable-truncated-text';

export function Text({ value }: { value: string | object | unknown[] }) {
  let displayValue = typeof value === 'object' || Array.isArray(value) ? JSON.stringify(value) : value;
  displayValue = displayValue === 'null' || displayValue == null ? '' : String(displayValue);

  return <CopyableTruncatedText value={displayValue} />;
}
