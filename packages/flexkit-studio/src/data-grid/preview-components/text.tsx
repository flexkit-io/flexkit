export function Text(value: string | object | unknown[]) {
  const displayValue = typeof value === 'object' || Array.isArray(value) ? JSON.stringify(value) : value;

  return <div className="fk-truncate">{displayValue}</div>;
}
