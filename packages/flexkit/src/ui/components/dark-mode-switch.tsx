import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

export function DarkModeSwitch(): JSX.Element {
  const { setTheme } = useTheme();

  return (
    <ToggleGroup size="sm" type="single">
      <ToggleGroupItem
        aria-label="Set dark mode"
        onClick={() => {
          setTheme('dark');
        }}
        value="dark"
      >
        <Moon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        aria-label="Set light mode"
        onClick={() => {
          setTheme('light');
        }}
        value="light"
      >
        <Sun className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        aria-label="Set system mode"
        onClick={() => {
          setTheme('system');
        }}
        value="system"
      >
        <Monitor className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
