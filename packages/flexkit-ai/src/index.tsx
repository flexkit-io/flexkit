import { Bot as BotIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import type { PluginOptions } from '@flexkit/studio';
import { Root } from './root';
import {
  ApprovalsPage,
  AutomationDetailPage,
  AutomationsPage,
  CreateAutomationPage,
  RunDetailPage,
  RunHistoryPage,
  RunsPage,
} from './pages';
import { CreateSkillPage, SkillDetailPage, SkillsPage } from './skills-pages';

const NavigateCompat = Navigate as unknown as React.ComponentType<{
  replace?: boolean;
  to: string;
}>;

export function AI(): PluginOptions {
  return {
    name: 'flexkit.ai',
    contributes: {
      apps: [
        {
          component: <Root />,
          icon: <BotIcon strokeWidth={1.5} />,
          name: 'ai',
          routes: [
            {
              component: <NavigateCompat replace to="automations" />,
              path: '',
            },
            {
              component: <AutomationsPage />,
              path: 'automations',
            },
            {
              component: <RunHistoryPage />,
              path: 'runs',
            },
            {
              component: <ApprovalsPage />,
              path: 'approvals',
            },
            {
              component: <CreateAutomationPage />,
              path: 'automations/new',
            },
            {
              component: <AutomationDetailPage />,
              path: 'automations/:automationId',
            },
            {
              component: <RunsPage />,
              path: 'automations/:automationId/runs',
            },
            {
              component: <RunDetailPage />,
              path: 'automations/:automationId/runs/:runId',
            },
            {
              component: <SkillsPage />,
              path: 'skills',
            },
            {
              component: <CreateSkillPage />,
              path: 'skills/new',
            },
            {
              component: <SkillDetailPage />,
              path: 'skills/:skillId',
            },
          ],
          title: 'AI',
        },
      ],
    },
  };
}

export type {
  Automation,
  AutomationApproval,
  AutomationApprovalStatus,
  AutomationApprovals,
  AutomationArtifact,
  AutomationCreditBalance,
  AutomationInput,
  AutomationMutationPolicy,
  AutomationRun,
  AutomationRunStatus,
  AutomationToolChannel,
  AutomationToolProvider,
  RunHistory,
  RunHistoryRun,
  Skill,
  SkillInput,
  SkillsList,
} from './types';
