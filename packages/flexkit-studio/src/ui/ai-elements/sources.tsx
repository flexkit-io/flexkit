"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../primitives/collapsible";
import { cn } from "../lib/utils";
import { BookIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type SourcesProps = ComponentProps<"div">;

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    className={cn("fk:not-prose fk:mb-4 fk:text-primary fk:text-xs", className)}
    {...props}
  />
);

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn("fk:flex fk:items-center fk:gap-2", className)}
    {...props}
  >
    {children ?? (
      <>
        <p className="fk:font-medium">Used {count} sources</p>
        <ChevronDownIcon className="fk:h-4 fk:w-4" />
      </>
    )}
  </CollapsibleTrigger>
);

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>;

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      "fk:mt-3 fk:flex fk:w-fit fk:flex-col fk:gap-2",
      "fk:data-[state=closed]:fade-out-0 fk:data-[state=closed]:slide-out-to-top-2 fk:data-[state=open]:slide-in-from-top-2 fk:outline-none fk:data-[state=closed]:animate-out fk:data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type SourceProps = ComponentProps<"a">;

export const Source = ({ href, title, children, ...props }: SourceProps) => (
  <a
    className="fk:flex fk:items-center fk:gap-2"
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    {children ?? (
      <>
        <BookIcon className="fk:h-4 fk:w-4" />
        <span className="fk:block fk:font-medium">{title}</span>
      </>
    )}
  </a>
);
