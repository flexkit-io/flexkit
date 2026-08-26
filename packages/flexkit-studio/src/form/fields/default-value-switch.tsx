import { useId } from 'react';
import type { JSX } from 'react';
import { Checkbox } from '../../ui/primitives/checkbox';

type Props = {
  scope: string | undefined;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

export function DefaultValueSwitch({ scope, checked, disabled, onChange }: Props): JSX.Element | null {
  const elementId = useId();

  if (!scope || scope === 'default') {
    return null;
  }

  return (
    <div className="fk:flex fk:items-center fk:space-x-2">
      <Checkbox checked={checked} disabled={disabled} id={elementId} onCheckedChange={onChange as () => void} />
      <label
        className="fk:text-xs fk:font-normal fk:leading-none fk:peer-disabled:cursor-not-allowed fk:peer-disabled:opacity-70"
        htmlFor={elementId}
      >
        Use default value
      </label>
    </div>
  );
}
