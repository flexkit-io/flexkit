import { FileStack as FileStackIcon } from 'lucide-react';
import type { PluginOptions } from '@flexkit/studio';
import { Root } from './root';

export function AssetManager(): PluginOptions {
  return {
    name: 'flexkit.asset-manager',
    contributes: {
      apps: [
        {
          name: 'asset-manager',
          icon: <FileStackIcon strokeWidth={1.5} />,
          title: 'Asset Manager',
          component: <Root />,
          routes: [],
        },
      ],
    },
  };
}
