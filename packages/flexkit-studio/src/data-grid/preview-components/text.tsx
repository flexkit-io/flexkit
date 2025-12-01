export function Text({ value }: { value: string | object | unknown[] }) {
  let displayValue = typeof value === 'object' || Array.isArray(value) ? JSON.stringify(value) : value;
  displayValue = displayValue === 'null' ? '' : displayValue;

  return <div className="fk-truncate">{displayValue}</div>;
}
