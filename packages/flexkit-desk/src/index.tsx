import { Layout as LayoutIcon } from 'lucide-react';
import { Root } from './root';
import { List } from './list';
import { EditEntity } from './edit-entity';
import type { PluginOptions } from '@flexkit/studio';

export function Desk(): PluginOptions {
  return {
    name: 'flexkit.desk',
    contributes: {
      apps: [
        {
          name: 'desk',
          icon: <LayoutIcon strokeWidth={1.5} />,
          title: 'Desk',
          component: <Root />,
          routes: [
            {
              path: 'list/:entity',
              component: <List />,
              children: [
                {
                  path: 'edit/:id',
                  component: <EditEntity />, // Not used, left here as an example of how to nest routes in plugins
                },
              ],
            },
          ],
        },
      ],
    },
  };
}
