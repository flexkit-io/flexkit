import { SquarePlay as SquarePlayIcon } from 'lucide-react';
import type { PluginOptions } from '@flexkit/core';
import { Root } from './root';

export function Explorer(): PluginOptions {
  return {
    name: 'flexkit.explorer',
    contributes: {
      apps: [
        {
          name: 'explorer',
          icon: <SquarePlayIcon strokeWidth={1.5} />,
          title: 'Explorer',
          component: <Root />,
          routes: [],
        },
      ],
    },
  };
}
