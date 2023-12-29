import { Layout as LayoutIcon } from 'lucide-react';
import { DeskApp } from './desk';
import type { AppOptions } from '@flexkit/studio';

export function Desk(): AppOptions {
  return {
    name: 'desk',
    icon: <LayoutIcon strokeWidth={1.5} />,
    title: 'Desk Test',
    component: <DeskApp />,
  } as AppOptions;
}
