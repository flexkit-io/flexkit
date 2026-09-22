import { FileStack as FileStackIcon } from 'lucide-react';
import type { StudioExtension } from '@flexkit/studio';
import { Asset } from './data-grid/preview-components/asset';
import { Root } from './root';

export function AssetManager(): StudioExtension {
  return {
    id: 'flexkit.asset-manager',
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
