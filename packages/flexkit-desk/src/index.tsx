import { Layout as LayoutIcon } from 'lucide-react';
import { DeskApp } from './desk';
import type { PluginOptions } from '@flexkit/studio';

export function Desk(): PluginOptions {
  return {
    name: 'flexkit.desk',
    contributes: {
      apps: [
        {
          name: 'desk',
          icon: <LayoutIcon strokeWidth={1.5} />,
          title: 'Desk Test',
          component: <DeskApp />,
        },
      ],
    },
  };
}
