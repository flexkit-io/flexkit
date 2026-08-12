"use client";

import { Button } from "../primitives/button";
import {
  ScrollArea,
  ScrollBar,
} from "../primitives/scroll-area";
import { cn } from "../lib/utils";
import type { ComponentProps } from "react";
import { useCallback } from "react";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <ScrollArea className="fk:w-full fk:overflow-x-auto fk:whitespace-nowrap" {...props}>
    <div className={cn("fk:flex fk:w-max fk:flex-nowrap fk:items-center fk:gap-2", className)}>
      {children}
    </div>
    <ScrollBar className="fk:hidden" orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion);
  }, [onClick, suggestion]);

  return (
    <Button
      className={cn("fk:cursor-pointer fk:rounded-full fk:px-4", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
