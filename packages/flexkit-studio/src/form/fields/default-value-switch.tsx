import { useId } from 'react';
import { Checkbox } from '../../ui/primitives/checkbox';

type Props = {
  scope: string | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function DefaultValueSwitch({ scope, checked, onChange }: Props): JSX.Element | null {
  const elementId = useId();

  if (!scope || scope === 'default') {
    return null;
  }

  return (
    <div className="fk-flex fk-items-center fk-space-x-2 fk-mb-2">
      <Checkbox checked={checked} id={elementId} onCheckedChange={onChange as () => void} />
      <label
        className="fk-text-xs fk-font-normal fk-leading-none peer-disabled:fk-cursor-not-allowed peer-disabled:fk-opacity-70"
        htmlFor={elementId}
      >
        Use default value
      </label>
    </div>
  );
}
