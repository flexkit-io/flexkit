import { Input } from '../primitives/input';

export function Search(): JSX.Element {
  return <Input className="py-1 h-9 md:w-[100px] lg:w-[300px]" placeholder="Search..." type="search" />;
}
