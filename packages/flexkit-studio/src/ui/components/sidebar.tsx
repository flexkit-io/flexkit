import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '../primitives/sidebar';
import type { Entity, MenuGroup } from '../../core/types';
import { groupBy } from 'ramda';
import { Icon } from './icon';

const NavLinkCompat = NavLink as unknown as React.ComponentType<{
  children?: React.ReactNode;
  to: string;
}>;

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  menuGroups?: MenuGroup[];
  schema: Entity[];
}

export function Sidebar({ className, menuGroups, schema }: SidebarProps): JSX.Element {
  // Filter out hidden items first, then group them
  const visibleItems = schema.filter((item) => item.menu?.hidden !== true);
  const itemsByGroup = groupBy(
    (item) => (item.menu?.group && menuGroups?.find((g) => g.name === item.menu?.group)?.name) || 'ungrouped',
    visibleItems
  );
  const nonEmptyGroups = menuGroups?.filter((menuGroup) => itemsByGroup[menuGroup.name]?.length);

  return (
    <SidebarPrimitive className={className} collapsible="icon" variant="inset">
      <SidebarContent>
        {nonEmptyGroups?.map((group) => (
          <SidebarGroup key={group.name}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {itemsByGroup[group.name]?.map((entity) => (
                <SidebarMenuItem key={entity.plural}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.includes(`/list/${entity.plural}`)}
                    tooltip={capitalize(entity.menu?.label ?? entity.plural)}
                  >
                    <NavLinkCompat to={`list/${entity.plural}`}>
                      <Icon className="fk:h-4 fk:w-4 fk:mr-2" fallbackFor={entity.name} name={entity.menu?.icon} />
                      <span>{capitalize(entity.menu?.label ?? entity.plural)}</span>
                    </NavLinkCompat>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        <SidebarGroup>
          <SidebarMenu>
            {itemsByGroup['ungrouped']?.map((entity) => (
              <SidebarMenuItem key={entity.plural}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.includes(`/list/${entity.plural}`)}
                  tooltip={capitalize(entity.menu?.label ?? entity.plural)}
                >
                  <NavLinkCompat to={`list/${entity.plural}`}>
                    <Icon className="fk:h-4 fk:w-4 fk:mr-2" fallbackFor={entity.name} name={entity.menu?.icon} />
                    <span>{capitalize(entity.menu?.label ?? entity.plural)}</span>
                  </NavLinkCompat>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </SidebarPrimitive>
  );
}

function capitalize(str: string): string {
  // Add space before capital letters and capitalize first letter
  const withSpaces = str.replace(/([A-Z])/g, ' $1');
  // Capitalize first letter and trim any leading space
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).trim();
}
