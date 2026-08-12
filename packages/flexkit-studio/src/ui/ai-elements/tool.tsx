'use client';

import { Badge } from '../primitives/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../primitives/collapsible';
import { cn } from '../lib/utils';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { CheckCircleIcon, ChevronDownIcon, CircleIcon, ClockIcon, WrenchIcon, XCircleIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { isValidElement } from 'react';

import { CodeBlock } from './code-block';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn('fk:group fk:not-prose fk:mb-4 fk:w-full fk:rounded-md fk:border', className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  className?: string;
} & (
  | { type: ToolUIPart['type']; state: ToolUIPart['state']; toolName?: never }
  | {
      type: DynamicToolUIPart['type'];
      state: DynamicToolUIPart['state'];
      toolName: string;
    }
);

const statusLabels: Record<ToolPart['state'], string> = {
  'approval-requested': 'Awaiting Approval',
  'approval-responded': 'Responded',
  'input-available': 'Running',
  'input-streaming': 'Pending',
  'output-available': 'Completed',
  'output-denied': 'Denied',
  'output-error': 'Error',
};

const statusIcons: Record<ToolPart['state'], ReactNode> = {
  'approval-requested': <ClockIcon className="fk:size-4 fk:text-yellow-600" />,
  'approval-responded': <CheckCircleIcon className="fk:size-4 fk:text-blue-600" />,
  'input-available': <ClockIcon className="fk:size-4 fk:animate-pulse" />,
  'input-streaming': <CircleIcon className="fk:size-4" />,
  'output-available': <CheckCircleIcon className="fk:size-4 fk:text-green-600" />,
  'output-denied': <XCircleIcon className="fk:size-4 fk:text-orange-600" />,
  'output-error': <XCircleIcon className="fk:size-4 fk:text-red-600" />,
};

export const getStatusBadge = (status: ToolPart['state']) => (
  <Badge className="fk:gap-1.5 fk:py-px fk:rounded-full fk:text-xs" variant="secondary">
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

export const ToolHeader = ({ className, title, type, state, toolName, ...props }: ToolHeaderProps) => {
  const derivedName = type === 'dynamic-tool' ? toolName : type.split('-').slice(1).join('-');

  return (
    <CollapsibleTrigger
      className={cn('fk:flex fk:w-full fk:items-center fk:justify-between fk:gap-4 fk:px-3 fk:py-2', className)}
      {...props}
    >
      <div className="fk:flex fk:items-center fk:gap-2">
        <WrenchIcon className="fk:size-4 fk:text-muted-foreground" />
        <span className="fk:font-medium fk:text-sm">{title ?? derivedName}</span>
        {getStatusBadge(state)}
      </div>
      <ChevronDownIcon className="fk:size-4 fk:text-muted-foreground fk:transition-transform fk:group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'fk:data-[state=closed]:fade-out-0 fk:data-[state=closed]:slide-out-to-top-2 fk:data-[state=open]:slide-in-from-top-2 fk:space-y-4 fk:p-4 fk:text-popover-foreground fk:outline-none fk:data-[state=closed]:animate-out fk:data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('fk:space-y-2 fk:overflow-hidden', className)} {...props}>
    <h4 className="fk:font-medium fk:text-muted-foreground fk:text-xs fk:uppercase fk:tracking-wide">Parameters</h4>
    <div className="fk:rounded-md fk:bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolPart['output'];
  errorText: ToolPart['errorText'];
};

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === 'object' && !isValidElement(output)) {
    Output = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />;
  } else if (typeof output === 'string') {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn('fk:space-y-2', className)} {...props}>
      <h4 className="fk:font-medium fk:text-muted-foreground fk:text-xs fk:uppercase fk:tracking-wide">
        {errorText ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          'fk:overflow-x-auto fk:rounded-md fk:text-xs fk:[&_table]:w-full',
          errorText ? 'fk:bg-destructive/10 fk:text-destructive' : 'fk:bg-muted/50 fk:text-foreground'
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
