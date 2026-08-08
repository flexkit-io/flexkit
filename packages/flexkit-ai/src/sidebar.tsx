import type { JSX } from 'react';
import { BotIcon, GraduationCapIcon, HistoryIcon, InboxIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import useSWR from 'swr';
import { useConfig } from '@flexkit/studio';
import {
  Badge,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPanel,
  SidebarRail,
} from '@flexkit/studio/ui';
import { fetcher, paths } from './api';
import type { AutomationApprovals } from './types';

const NavLinkCompat = NavLink as unknown as React.ComponentType<{
  children?: React.ReactNode;
  to: string;
}>;

function PendingApprovalsBadge(): JSX.Element | null {
  const { currentProjectId } = useConfig();
  const { data } = useSWR<AutomationApprovals>(
    currentProjectId ? paths(currentProjectId).approvalsCount : null,
    fetcher,
    { refreshInterval: 30_000 }
  );
  const pendingCount = data?.pendingCount ?? 0;

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Badge className="fk:ml-auto fk:h-5 fk:min-w-5 fk:justify-center fk:rounded-full fk:bg-amber-500/20 fk:px-1.5 fk:text-[0.6875rem] fk:text-amber-600 fk:border-none">
      {pendingCount > 99 ? '99+' : pendingCount.toString()}
    </Badge>
  );
}

export function AutomationsSidebar(): JSX.Element {
  const location = useLocation();
  const isRunHistory = location.pathname.endsWith('/ai/runs');
  const isApprovals = location.pathname.endsWith('/ai/approvals');
  const isSkills = location.pathname.includes('/ai/skills');
  const isAutomations = !isRunHistory && !isApprovals && !isSkills;

  return (
    <SidebarPanel collapsible="icon" variant="inset">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isAutomations} tooltip="Automations">
                <NavLinkCompat to="automations">
                  <BotIcon className="fk:h-4 fk:w-4" strokeWidth={2} />
                  <span>Automations</span>
                </NavLinkCompat>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isSkills} tooltip="Skills">
                <NavLinkCompat to="skills">
                  <GraduationCapIcon className="fk:h-4 fk:w-4" strokeWidth={2} />
                  <span>Skills</span>
                </NavLinkCompat>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isRunHistory} tooltip="Run History">
                <NavLinkCompat to="runs">
                  <HistoryIcon className="fk:h-4 fk:w-4" strokeWidth={2} />
                  <span>Run History</span>
                </NavLinkCompat>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isApprovals} tooltip="Approvals">
                <NavLinkCompat to="approvals">
                  <InboxIcon className="fk:h-4 fk:w-4" strokeWidth={2} />
                  <span>Approvals</span>
                  <PendingApprovalsBadge />
                </NavLinkCompat>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </SidebarPanel>
  );
}
