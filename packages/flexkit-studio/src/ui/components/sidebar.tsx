import { createElement } from 'react';
import * as Icons from 'lucide-react';
import Fuse from 'fuse.js';
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
import type { SingleProject } from '@flexkit/studio';
import { groupBy } from 'ramda';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  groups?: SingleProject['groups'];
  schema: SingleProject['schema'];
}

const iconList = Object.keys(Icons).map((iconName) => ({
  name: iconName,
  icon: Icons[iconName as keyof typeof Icons],
}));

const fuse = new Fuse(iconList, {
  keys: ['name'],
  threshold: 0.5,
});

export function Sidebar({ className, groups, schema }: SidebarProps): JSX.Element {
  const itemsByGroup = groupBy(
    (item) => (item.group && groups?.find((g) => g.name === item.group)?.name) || 'ungrouped',
    schema
  );
  const nonEmptyGroups = groups?.filter((group) => itemsByGroup[group.name]?.length);

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
                    tooltip={capitalize(entity.plural)}
                  >
                    <NavLink to={`list/${entity.plural}`}>
                      {createElement(Icons[getBestMatchingIcon(entity.name)] as React.ComponentType<any>, {
                        className: 'fk-h-4 fk-w-4 fk-mr-2',
                        strokeWidth: 2,
                      })}
                      <span>{capitalize(entity.plural)}</span>
                    </NavLink>
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
                  tooltip={capitalize(entity.plural)}
                >
                  <NavLink to={`list/${entity.plural}`}>
                    {createElement(Icons[getBestMatchingIcon(entity.name)] as React.ComponentType<any>, {
                      className: 'fk-h-4 fk-w-4 fk-mr-2',
                      strokeWidth: 2,
                    })}
                    <span>{capitalize(entity.plural)}</span>
                  </NavLink>
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

/**
 * Tries to get the best matching icon for an entity name using fuzy search
 */
function getBestMatchingIcon(concept: string): keyof typeof Icons {
  const result = fuse.search(concept);

  if (result.length > 0) {
    return result[0].item.name as keyof typeof Icons;
  }

  return 'Dock' as keyof typeof Icons;
}
