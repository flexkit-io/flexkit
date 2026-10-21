import type { JSX } from 'react';
import { CheckCircle2Icon, CircleAlertIcon, LibraryIcon, LoaderCircleIcon } from 'lucide-react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPanel,
  SidebarRail,
} from '../../ui';
import type { KnowledgeSourceStatus } from './knowledge';

const NavLinkCompat = NavLink as unknown as React.ComponentType<{
  children?: React.ReactNode;
  end?: boolean;
  to: string;
}>;

const FILTERS: { icon: JSX.Element; label: string; status: KnowledgeSourceStatus | null }[] = [
  { icon: <LibraryIcon className="fk:size-4" strokeWidth={2} />, label: 'All documents', status: null },
  { icon: <CheckCircle2Icon className="fk:size-4" strokeWidth={2} />, label: 'Ready', status: 'ready' },
  { icon: <LoaderCircleIcon className="fk:size-4" strokeWidth={2} />, label: 'Indexing', status: 'processing' },
  { icon: <CircleAlertIcon className="fk:size-4" strokeWidth={2} />, label: 'Failed', status: 'failed' },
];

/** The status the list is filtered on, read from `?status=`; anything else means every document. */
export function useKnowledgeStatusFilter(): KnowledgeSourceStatus | undefined {
  const [searchParams] = useSearchParams();
  const value = searchParams.get('status');

  return value === 'ready' || value === 'processing' || value === 'failed' ? value : undefined;
}

export function KnowledgeSidebar(): JSX.Element {
  const { pathname } = useLocation();
  const status = useKnowledgeStatusFilter();
  const onList = /\/knowledge\/?$/.test(pathname);
  // Links resolve against the app root whether the list or a document is open.
  const base = /^(.*\/knowledge)(?:\/|$)/.exec(pathname)?.[1] ?? 'knowledge';

  return (
    <SidebarPanel collapsible="icon" variant="inset">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Documents</SidebarGroupLabel>
          <SidebarMenu>
            {FILTERS.map((filter) => (
              <SidebarMenuItem key={filter.label}>
                <SidebarMenuButton
                  asChild
                  isActive={onList && (status ?? null) === filter.status}
                  tooltip={filter.label}
                >
                  <NavLinkCompat end to={filter.status ? `${base}?status=${filter.status}` : base}>
                    {filter.icon}
                    <span>{filter.label}</span>
                  </NavLinkCompat>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </SidebarPanel>
  );
}
