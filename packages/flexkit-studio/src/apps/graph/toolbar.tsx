'use client';

import type { JSX } from 'react';
import { EraserIcon, ExpandIcon, EyeOffIcon, LoaderCircleIcon, ScanIcon } from 'lucide-react';
import { Button, Separator, Tooltip, TooltipContent, TooltipTrigger } from '../../ui';

export interface GraphToolbarProps {
  hasSelection: boolean;
  hasNodes: boolean;
  isLoading: boolean;
  onFit: () => void;
  onExpand: () => void;
  onHide: () => void;
  onClear: () => void;
}

function ToolbarButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: JSX.Element;
  disabled?: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button className="fk:h-8 fk:gap-1.5 fk:px-2.5" disabled={disabled} onClick={onClick} size="sm" variant="ghost">
          {icon}
          <span className="fk:text-xs">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** The floating actions over the canvas. */
export function GraphToolbar({
  hasSelection,
  hasNodes,
  isLoading,
  onFit,
  onExpand,
  onHide,
  onClear,
}: GraphToolbarProps): JSX.Element {
  return (
    <div
      className="fk:flex fk:items-center fk:gap-0.5 fk:rounded-lg fk:border fk:bg-background fk:p-1 fk:shadow-xs"
      data-testid="graph-toolbar"
    >
      <ToolbarButton disabled={!hasNodes} icon={<ScanIcon className="fk:size-3.5" />} label="Fit" onClick={onFit} />
      <Separator className="fk:mx-0.5 fk:h-4" orientation="vertical" />
      <ToolbarButton
        disabled={!hasSelection || isLoading}
        icon={isLoading ? <LoaderCircleIcon className="fk:size-3.5 fk:animate-spin" /> : <ExpandIcon className="fk:size-3.5" />}
        label="Expand"
        onClick={onExpand}
      />
      <ToolbarButton disabled={!hasSelection} icon={<EyeOffIcon className="fk:size-3.5" />} label="Hide" onClick={onHide} />
      <Separator className="fk:mx-0.5 fk:h-4" orientation="vertical" />
      <ToolbarButton disabled={!hasNodes} icon={<EraserIcon className="fk:size-3.5" />} label="Clear" onClick={onClear} />
    </div>
  );
}
