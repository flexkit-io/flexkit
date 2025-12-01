'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '../lib/utils';
import { buttonVariants } from './button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('fk-p-3', className)}
      classNames={{
        months: 'fk-flex fk-flex-col sm:fk-flex-row fk-space-y-4 sm:fk-space-x-4 sm:fk-space-y-0',
        month: 'fk-space-y-4',
        caption: 'fk-flex fk-justify-center fk-pt-1 fk-relative fk-items-center',
        caption_label: 'fk-text-sm fk-font-medium',
        nav: 'fk-space-x-1 fk-flex fk-items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'fk-h-7 fk-w-7 fk-bg-transparent fk-p-0 fk-opacity-50 hover:fk-opacity-100'
        ),
        nav_button_previous: 'fk-absolute fk-left-1',
        nav_button_next: 'fk-absolute fk-right-1',
        table: 'fk-w-full fk-border-collapse fk-space-y-1',
        head_row: 'fk-flex',
        head_cell: 'fk-text-muted-foreground fk-rounded-md fk-w-9 fk-font-normal fk-text-[0.8rem]',
        row: 'fk-flex fk-w-full fk-mt-2',
        cell: 'fk-h-9 fk-w-9 fk-text-center fk-text-sm fk-p-0 fk-relative [&:has([aria-selected].day-range-end)]:fk-rounded-r-md [&:has([aria-selected].day-outside)]:fk-bg-accent/50 [&:has([aria-selected])]:fk-bg-accent first:[&:has([aria-selected])]:fk-rounded-l-md last:[&:has([aria-selected])]:fk-rounded-r-md focus-within:fk-relative focus-within:fk-z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'fk-h-9 fk-w-9 fk-p-0 fk-font-normal aria-selected:fk-opacity-100'
        ),
        day_range_end: 'fk-day-range-end',
        day_selected:
          'fk-bg-primary fk-text-primary-foreground hover:fk-bg-primary hover:fk-text-primary-foreground focus:fk-bg-primary focus:fk-text-primary-foreground',
        day_today: 'fk-bg-accent fk-text-accent-foreground',
        day_outside:
          'fk-day-outside fk-text-muted-foreground fk-opacity-50 aria-selected:fk-bg-accent/50 aria-selected:fk-text-muted-foreground aria-selected:fk-opacity-30',
        day_disabled: 'fk-text-muted-foreground fk-opacity-50',
        day_range_middle: 'aria-selected:fk-bg-accent aria-selected:fk-text-accent-foreground',
        day_hidden: 'fk-invisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="fk-h-4 fk-w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="fk-h-4 fk-w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
