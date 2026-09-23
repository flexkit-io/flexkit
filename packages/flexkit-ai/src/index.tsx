import { MarketplacePage, PluginDetailPage } from './marketplace-pages';
import { Bot as BotIcon } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import type { StudioExtension } from '@flexkit/studio';
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
import { AgentChatPage } from './agent/chat-page';

const NavigateCompat = Navigate as unknown as React.ComponentType<{
  replace?: boolean;
  to: string;
}>;

export function AI(): StudioExtension {
  return {
    id: 'flexkit.ai',
    contributes: {
      apps: [
        {
          component: <Root />,
          icon: <BotIcon strokeWidth={1.5} />,
          name: 'ai',
          routes: [
            { path: 'marketplace', component: <MarketplacePage /> },
            { path: 'marketplace/:pluginId', component: <PluginDetailPage /> },
            {
              component: <NavigateCompat replace to="agent" />,
              path: '',
            },
            {
              component: <AgentChatPage />,
              path: 'agent',
            },
            {
              component: <AgentChatPage />,
              path: 'agent/chats/:chatId',
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
  AgentChat,
  AgentChatAttachment,
  AgentChatDetail,
  AgentChatMessage,
  AgentChatMessageRole,
  AgentChatMessageStatus,
  AgentChatPart,
  AgentChatSearchResult,
  AgentChatTurn,
  AgentChatsList,
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
