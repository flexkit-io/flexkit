import { Badge } from '../../ui/primitives/badge';

export function Tags({ value }: { value: string }) {
  if (!value || !value.split(',').length) {
    return null;
  }

  return (
    <div className="fk-flex fk-flex-wrap fk-gap-1 fk-max-w-full truncate">
      {value.split(',').map((tag) => (
        <Badge
          className="fk-px-2.5 fk-py-0 fk-font-normal fk-text-[0.6875rem] fk-leading-4"
          key={tag}
          variant="secondary"
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}
