'use client';

import { ThemeProvider } from './theme-context';
import { DarkModeSwitch } from './components/dark-mode-switch';

export function FlexkitStudio(): JSX.Element {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
      <DarkModeSwitch />
    </ThemeProvider>
  );
}
