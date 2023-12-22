import { Layout as LayoutIcon } from 'lucide-react';
import type { AppOptions } from '../core/config/types';

export function Desk(): AppOptions {
  return {
    name: 'desk',
    icon: <LayoutIcon strokeWidth={1.5} />,
    title: 'Desk Test',
    component: <div>Desk</div>,
  } as AppOptions;
}
