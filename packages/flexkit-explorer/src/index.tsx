import { SquarePlay as SquarePlayIcon } from 'lucide-react';
import type { StudioExtension } from '@flexkit/studio';
import { Root } from './root';

export function Explorer(): StudioExtension {
  return {
    id: 'flexkit.explorer',
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
