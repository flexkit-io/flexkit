'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX, MouseEvent } from 'react';
import { Check as CheckIcon, Copy as CopyIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/primitives/tooltip';
import { cn } from '../../ui/lib/utils';

const TOOLTIP_MAX_LENGTH = 500;
const COPIED_DISMISS_MS = 3000;

type CopyableTruncatedTextProps = {
  value: string;
};

export function CopyableTruncatedText({ value }: CopyableTruncatedTextProps): JSX.Element {
  const textRef = useRef<HTMLSpanElement>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  useEffect(() => {
    const element = textRef.current;

    if (!element) {
      return;
    }

    function updateTruncation(): void {
      if (!textRef.current) {
        return;
      }

      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }

    updateTruncation();

    const observer = new ResizeObserver(updateTruncation);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [value]);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  async function handleClick(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    event.preventDefault();
    event.stopPropagation();

    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }

    setCopied(true);
    setTooltipOpen(true);

    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }

    dismissTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      setTooltipOpen(false);
    }, COPIED_DISMISS_MS);
  }

  function handleTooltipOpenChange(open: boolean): void {
    if (copied) {
      return;
    }

    setTooltipOpen(open && isTruncated);
  }

  if (!value) {
    return <div className="fk:truncate" />;
  }

  const tooltipText =
    value.length > TOOLTIP_MAX_LENGTH ? `${value.slice(0, TOOLTIP_MAX_LENGTH)}…` : value;

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip open={tooltipOpen} onOpenChange={handleTooltipOpenChange}>
        <TooltipTrigger asChild>
          <button
            aria-label="Copy value"
            className={cn(
              'fk:group/copyable fk:relative fk:flex fk:w-full fk:min-w-0 fk:items-center fk:rounded-sm fk:border-0 fk:bg-transparent fk:px-0.5 fk:-mx-0.5 fk:py-0.5 fk:text-left fk:text-inherit fk:font-inherit',
              'fk:cursor-pointer fk:transition-[transform,background-color] fk:duration-75 fk:ease-out',
              'fk:hover:bg-muted/50 fk:active:translate-y-px fk:active:scale-[0.98] fk:active:bg-muted/70',
              'fk:focus-visible:outline-hidden fk:focus-visible:ring-1 fk:focus-visible:ring-ring'
            )}
            onClick={handleClick}
            type="button"
          >
            <span className="fk:min-w-0 fk:flex-1 fk:truncate fk:pr-4" ref={textRef}>
              {value}
            </span>
            <span
              aria-hidden
              className={cn(
                'fk:pointer-events-none fk:absolute fk:right-0.5 fk:top-1/2 fk:flex fk:-translate-y-1/2 fk:items-center fk:justify-center',
                'fk:rounded-sm fk:bg-muted/80 fk:p-0.5 fk:text-muted-foreground fk:shadow-sm fk:ring-1 fk:ring-border/60',
                'fk:transition-opacity fk:duration-100',
                copied
                  ? 'fk:opacity-100 fk:text-foreground'
                  : 'fk:opacity-0 fk:group-hover/copyable:opacity-100 fk:group-focus-visible/copyable:opacity-100'
              )}
            >
              {copied ? <CheckIcon className="fk:size-3" /> : <CopyIcon className="fk:size-3" />}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="fk:max-w-xs fk:wrap-break-word">
          {copied ? 'Copied to clipboard' : tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
