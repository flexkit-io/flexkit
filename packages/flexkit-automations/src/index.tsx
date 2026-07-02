import { Bot as BotIcon } from 'lucide-react';
import type { PluginOptions } from '@flexkit/studio';
import { Root } from './root';
import {
  AutomationDetailPage,
  AutomationsPage,
  CreateAutomationPage,
  RunDetailPage,
  RunHistoryPage,
  RunsPage,
} from './pages';

export function Automations(): PluginOptions {
  return {
    name: 'flexkit.automations',
    contributes: {
      apps: [
        {
          component: <Root />,
          icon: <BotIcon strokeWidth={1.5} />,
          name: 'automations',
          routes: [
            {
              component: <AutomationsPage />,
              path: '',
            },
            {
              component: <RunHistoryPage />,
              path: 'runs',
            },
            {
              component: <CreateAutomationPage />,
              path: 'new',
            },
            {
              component: <AutomationDetailPage />,
              path: ':automationId',
            },
            {
              component: <RunsPage />,
              path: ':automationId/runs',
            },
            {
              component: <RunDetailPage />,
              path: ':automationId/runs/:runId',
            },
          ],
          title: 'Automations',
        },
      ],
    },
  };
}

export type {
  Automation,
  AutomationArtifact,
  AutomationCreditBalance,
  AutomationInput,
  AutomationRun,
  AutomationRunStatus,
  AutomationToolChannel,
  AutomationToolProvider,
  RunHistory,
  RunHistoryRun,
} from './types';
