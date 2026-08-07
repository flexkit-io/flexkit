'use client';

import { Info } from 'lucide-react';
import type { JSX, ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/tooltip';

export function InsufficientPermissionsTooltipContent(): JSX.Element {
  return (
    <TooltipContent className="fk:max-w-64 fk:p-3">
      <div className="fk:flex fk:gap-2.5">
        <Info className="fk:mt-0.5 fk:h-4 fk:w-4 fk:shrink-0 fk:opacity-70" />
        <div className="fk:flex fk:flex-col fk:gap-1">
          <p className="fk:text-sm fk:font-semibold fk:leading-none">Insufficient permissions</p>
          <p className="fk:text-xs fk:opacity-70 fk:leading-snug">Your member role cannot perform this action</p>
        </div>
      </div>
    </TooltipContent>
  );
}

/**
 * Wraps a disabled control so it still shows an "Insufficient permissions"
 * tooltip on hover (disabled buttons swallow pointer events, hence the span).
 */
export function PermissionTooltip({ disabled, children }: { disabled: boolean; children: ReactNode }): JSX.Element {
  if (!disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="fk:inline-flex">{children}</span>
        </TooltipTrigger>
        <InsufficientPermissionsTooltipContent />
      </Tooltip>
    </TooltipProvider>
  );
}
