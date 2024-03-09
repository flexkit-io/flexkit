import { Checkbox } from '../../ui/primitives/checkbox';

type Props = {
  scope: string | undefined;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function UseDefault({ scope, checked, onChange }: Props): JSX.Element | null {
  if (!scope || scope === 'default') {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 mb-2">
      <Checkbox checked={checked} id="terms" onCheckedChange={onChange as () => void} />
      <label
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        htmlFor="terms"
      >
        Use default value
      </label>
    </div>
  );
}
