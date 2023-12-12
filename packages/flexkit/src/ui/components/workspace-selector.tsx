import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../primitives/select';

export function WorkspaceSelector(): JSX.Element {
  return (
    <Select>
      <SelectTrigger className="w-[180px] h-9 py-1">
        <SelectValue placeholder="Select a workspace" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="text-xs">Workspace</SelectLabel>
          <SelectItem value="production">Production</SelectItem>
          <SelectItem value="staging">Staging</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
