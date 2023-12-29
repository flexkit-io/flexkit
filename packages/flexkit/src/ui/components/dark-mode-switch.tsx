import { useState, useEffect } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ToggleGroup, ToggleGroupItem } from '../primitives/toggle-group';

export function DarkModeSwitch(): JSX.Element | null {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ToggleGroup size="sm" type="single" value={theme}>
      <ToggleGroupItem
        aria-label="Set dark mode"
        onClick={() => {
          setTheme('dark');
        }}
        value="dark"
      >
        <Moon className="fk-h-4 fk-w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        aria-label="Set light mode"
        onClick={() => {
          setTheme('light');
        }}
        value="light"
      >
        <Sun className="fk-h-4 fk-w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        aria-label="Set system mode"
        onClick={() => {
          setTheme('system');
        }}
        value="system"
      >
        <Monitor className="fk-h-4 fk-w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
