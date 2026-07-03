import type { JSX } from 'react';
import { BotIcon, HistoryIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPanel,
  SidebarRail,
} from '@flexkit/studio/ui';

const NavLinkCompat = NavLink as unknown as React.ComponentType<{
  children?: React.ReactNode;
  to: string;
}>;

export function AutomationsSidebar(): JSX.Element {
  const location = useLocation();
  const isRunHistory = location.pathname.endsWith('/automations/runs');

  return (
    <SidebarPanel collapsible="icon" variant="inset">
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={!isRunHistory} tooltip="Automations">
                <NavLinkCompat to=".">
                  <BotIcon className="fk:h-4 fk:w-4" strokeWidth={2} />
                  <span>Automations</span>
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
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </SidebarPanel>
  );
}
