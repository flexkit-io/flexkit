import type { JSX } from 'react';
import { useState } from 'react';
import { BotIcon, GraduationCapIcon, HistoryIcon, InboxIcon, SearchIcon, SquarePenIcon, XIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import useSWR from 'swr';
import { useConfig } from '@flexkit/studio';
import {
  Badge,
  Input,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPanel,
  SidebarRail,
} from '@flexkit/studio/ui';
import { fetcher, paths } from './api';
import { AgentChatsSection, useDebouncedValue } from './agent/chat-list';
import type { AutomationApprovals } from './types';

const SEARCH_DEBOUNCE_MS = 300;

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
  const pathname = location.pathname.replace(/\/$/, '');
  const isNewChat = pathname.endsWith('/ai/agent');
  const isRunHistory = pathname.endsWith('/ai/runs');
  const isApprovals = pathname.endsWith('/ai/approvals');
  const isSkills = pathname.includes('/ai/skills');
  const isAutomations = pathname.includes('/ai/automations');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);

  return (
    <SidebarPanel collapsible="icon" variant="inset">
      <SidebarGroup className="fk:shrink-0 fk:pb-1.5 fk:group-data-[collapsible=icon]:hidden">
        <SidebarGroupContent className="fk:relative">
          <SearchIcon className="fk:absolute fk:left-2 fk:top-1/2 fk:size-3.5 fk:-translate-y-1/2 fk:text-muted-foreground" />
          <Input
            className="fk:h-8 fk:bg-background fk:pl-7 fk:pr-7 fk:text-sm"
            placeholder="Search chats..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="fk:absolute fk:right-2 fk:top-1/2 fk:-translate-y-1/2 fk:cursor-pointer fk:text-muted-foreground fk:hover:text-foreground"
              type="button"
              onClick={() => setQuery('')}
            >
              <XIcon className="fk:size-3.5" />
            </button>
          ) : null}
        </SidebarGroupContent>
      </SidebarGroup>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isNewChat} tooltip="New chat">
                <NavLinkCompat to="agent">
                  <SquarePenIcon className="fk:h-4 fk:w-4" strokeWidth={2} />
                  <span>New chat</span>
                </NavLinkCompat>
              </SidebarMenuButton>
            </SidebarMenuItem>
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
        <SidebarGroup className="fk:mt-4 fk:group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <AgentChatsSection query={debouncedQuery} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </SidebarPanel>
  );
}
