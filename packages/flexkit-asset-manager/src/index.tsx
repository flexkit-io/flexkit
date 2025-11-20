import './styles.css';

import { FileStack as FileStackIcon } from 'lucide-react';
import type { PluginOptions } from '@flexkit/core';
import { Asset } from './data-grid/preview-components/asset';
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
      previewFields: {
        assetPreviewField: {
          component: Asset,
          description: 'Asset preview field for the asset manager',
        },
      },
    },
  };
}
