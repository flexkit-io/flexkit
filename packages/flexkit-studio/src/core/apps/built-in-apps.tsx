import { lazy, Suspense } from 'react';
import type { ComponentType, JSX } from 'react';
import {
  Bot as BotIcon,
  FileStack as FileStackIcon,
  Layout as LayoutIcon,
  SquarePlay as SquarePlayIcon,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Loading } from '../../ui/components/loading';
import type { AppOptions } from '../config/types';

const NavigateCompat = Navigate as unknown as ComponentType<{
  replace?: boolean;
  to: string;
}>;

/**
 * Wraps a lazily imported component in Suspense so each built-in app (and each of its routes)
 * is only downloaded when it is first rendered.
 */
function lazyElement(loader: () => Promise<{ default: ComponentType }>): JSX.Element {
  const Component = lazy(loader);

  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
}

// Desk
const deskRoot = lazyElement(() => import('../../apps/desk/root').then((m) => ({ default: m.Root })));
const deskList = lazyElement(() => import('../../apps/desk/list').then((m) => ({ default: m.List })));
const deskEditEntity = lazyElement(() =>
  import('../../apps/desk/edit-entity').then((m) => ({ default: m.EditEntity }))
);

// Asset Manager
const assetManagerRoot = lazyElement(() =>
  import('../../apps/asset-manager/root').then((m) => ({ default: m.Root }))
);

// Explorer
const explorerRoot = lazyElement(() => import('../../apps/explorer/root').then((m) => ({ default: m.Root })));

// AI
const aiRoot = lazyElement(() => import('../../apps/ai/root').then((m) => ({ default: m.Root })));
const aiPluginsPage = lazyElement(() =>
  import('../../apps/ai/plugin-pages').then((m) => ({ default: m.PluginsPage }))
);
const aiInstalledPluginsPage = lazyElement(() =>
  import('../../apps/ai/plugin-pages').then((m) => ({ default: m.InstalledPluginsPage }))
);
const aiPluginDetailPage = lazyElement(() =>
  import('../../apps/ai/plugin-pages').then((m) => ({ default: m.PluginDetailPage }))
);
const aiAgentChatPage = lazyElement(() =>
  import('../../apps/ai/agent/chat-page').then((m) => ({ default: m.AgentChatPage }))
);
const aiAutomationsPage = lazyElement(() =>
  import('../../apps/ai/pages').then((m) => ({ default: m.AutomationsPage }))
);
const aiRunHistoryPage = lazyElement(() =>
  import('../../apps/ai/pages').then((m) => ({ default: m.RunHistoryPage }))
);
const aiApprovalsPage = lazyElement(() => import('../../apps/ai/pages').then((m) => ({ default: m.ApprovalsPage })));
const aiCreateAutomationPage = lazyElement(() =>
  import('../../apps/ai/pages').then((m) => ({ default: m.CreateAutomationPage }))
);
const aiAutomationDetailPage = lazyElement(() =>
  import('../../apps/ai/pages').then((m) => ({ default: m.AutomationDetailPage }))
);
const aiRunsPage = lazyElement(() => import('../../apps/ai/pages').then((m) => ({ default: m.RunsPage })));
const aiRunDetailPage = lazyElement(() => import('../../apps/ai/pages').then((m) => ({ default: m.RunDetailPage })));
const aiSkillsPage = lazyElement(() =>
  import('../../apps/ai/skills-pages').then((m) => ({ default: m.SkillsPage }))
);
const aiCreateSkillPage = lazyElement(() =>
  import('../../apps/ai/skills-pages').then((m) => ({ default: m.CreateSkillPage }))
);
const aiSkillDetailPage = lazyElement(() =>
  import('../../apps/ai/skills-pages').then((m) => ({ default: m.SkillDetailPage }))
);

export const builtInApps: AppOptions[] = [
  {
    name: 'ai',
    icon: <BotIcon strokeWidth={1.5} />,
    title: 'AI',
    component: aiRoot,
    routes: [
      { path: 'plugins', component: aiPluginsPage },
      { path: 'plugins/installed', component: aiInstalledPluginsPage },
      { path: 'plugins/:pluginId', component: aiPluginDetailPage },
      {
        component: <NavigateCompat replace to="agent" />,
        path: '',
      },
      {
        component: aiAgentChatPage,
        path: 'agent',
      },
      {
        component: aiAgentChatPage,
        path: 'agent/chats/:chatId',
      },
      {
        component: aiAutomationsPage,
        path: 'automations',
      },
      {
        component: aiRunHistoryPage,
        path: 'runs',
      },
      {
        component: aiApprovalsPage,
        path: 'approvals',
      },
      {
        component: aiCreateAutomationPage,
        path: 'automations/new',
      },
      {
        component: aiAutomationDetailPage,
        path: 'automations/:automationId',
      },
      {
        component: aiRunsPage,
        path: 'automations/:automationId/runs',
      },
      {
        component: aiRunDetailPage,
        path: 'automations/:automationId/runs/:runId',
      },
      {
        component: aiSkillsPage,
        path: 'skills',
      },
      {
        component: aiCreateSkillPage,
        path: 'skills/new',
      },
      {
        component: aiSkillDetailPage,
        path: 'skills/:skillId',
      },
    ],
  },
  {
    name: 'desk',
    icon: <LayoutIcon strokeWidth={1.5} />,
    title: 'Desk',
    component: deskRoot,
    routes: [
      {
        path: 'list/:entity',
        component: deskList,
        children: [
          {
            path: 'edit/:id',
            component: deskEditEntity, // Not used, left here as an example of how to nest routes in apps
          },
        ],
      },
    ],
  },
  {
    name: 'asset-manager',
    icon: <FileStackIcon strokeWidth={1.5} />,
    title: 'Asset Manager',
    component: assetManagerRoot,
    routes: [],
  },
  {
    name: 'explorer',
    icon: <SquarePlayIcon strokeWidth={1.5} />,
    title: 'Explorer',
    component: explorerRoot,
    routes: [],
  },
];
