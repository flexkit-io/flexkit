'use client';

import type { JSX } from 'react';
import type { Attribute } from '../../core/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../ui';

export interface GraphContextMenuState {
  key: string;
  x: number;
  y: number;
}

export interface GraphContextMenuProps {
  menu: GraphContextMenuState | null;
  relationships: Attribute[];
  isPinned: boolean;
  onClose: () => void;
  onExpandAll: (key: string) => void;
  onExpandAttribute: (key: string, attribute: Attribute) => void;
  onHide: (key: string) => void;
  onHideOthers: (key: string) => void;
  onTogglePin: (key: string) => void;
  onOpenRecord: (key: string) => void;
}

/** The right-click menu of a node, anchored at the pointer. */
export function GraphContextMenu({
  menu,
  relationships,
  isPinned,
  onClose,
  onExpandAll,
  onExpandAttribute,
  onHide,
  onHideOthers,
  onTogglePin,
  onOpenRecord,
}: GraphContextMenuProps): JSX.Element {
  const key = menu?.key ?? '';

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={menu !== null}
    >
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden="true"
          className="fk:fixed fk:size-0"
          style={{ left: menu?.x ?? 0, top: menu?.y ?? 0 }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="fk:w-52" data-testid="graph-context-menu" side="bottom">
        <DropdownMenuItem onSelect={() => onExpandAll(key)}>Expand all</DropdownMenuItem>
        {relationships.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Expand</DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="fk:max-h-80 fk:overflow-y-auto">
              {relationships.map((attribute) => (
                <DropdownMenuItem key={attribute.name} onSelect={() => onExpandAttribute(key, attribute)}>
                  {attribute.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onHide(key)}>Hide</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onHideOthers(key)}>Hide others</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onTogglePin(key)}>{isPinned ? 'Unpin position' : 'Pin position'}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onOpenRecord(key)}>Open record</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
