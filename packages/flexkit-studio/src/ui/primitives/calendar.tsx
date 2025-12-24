'use client';

import * as React from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';
import { cn } from '../lib/utils';
import { Button, buttonVariants } from './button';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'fk-bg-background fk-group/calendar fk-p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:fk-bg-transparent [[data-slot=popover-content]_&]:fk-bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:fk-rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:fk-rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('fk-w-fit', defaultClassNames.root),
        months: cn('fk-relative fk-flex fk-flex-col fk-gap-4 md:fk-flex-row', defaultClassNames.months),
        month: cn('fk-flex fk-w-full fk-flex-col fk-gap-4', defaultClassNames.month),
        nav: cn(
          'fk-absolute fk-inset-x-0 fk-top-0 fk-flex fk-w-full fk-items-center fk-justify-between fk-gap-1',
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'fk-h-7 fk-w-7 fk-select-none fk-p-0 aria-disabled:fk-opacity-50',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'fk-h-7 fk-w-7 fk-select-none fk-p-0 aria-disabled:fk-opacity-50',
          defaultClassNames.button_next
        ),
        month_caption: cn(
          'fk-flex fk-h-[--cell-size] fk-w-full fk-items-center fk-justify-center fk-px-[--cell-size]',
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          'fk-flex fk-h-[--cell-size] fk-w-full fk-items-center fk-justify-center fk-gap-1.5 fk-text-sm fk-font-medium',
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          'has-focus:fk-border-ring fk-border-input fk-shadow-xs has-focus:fk-ring-ring/50 has-focus:fk-ring-[3px] fk-relative fk-rounded-md fk-border',
          defaultClassNames.dropdown_root
        ),
        dropdown: cn('fk-bg-popover fk-absolute fk-inset-0 fk-opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'fk-select-none fk-font-medium',
          captionLayout === 'label'
            ? 'fk-text-sm'
            : '[&>svg]:fk-text-muted-foreground fk-flex fk-h-8 fk-items-center fk-gap-1 fk-rounded-md fk-pl-2 fk-pr-1 fk-text-sm [&>svg]:fk-size-3.5',
          defaultClassNames.caption_label
        ),
        table: 'fk-w-full fk-border-collapse',
        weekdays: cn('fk-flex', defaultClassNames.weekdays),
        weekday: cn(
          'fk-text-muted-foreground fk-flex-1 fk-w-9 fk-select-none fk-rounded-md fk-text-[0.8rem] fk-font-normal',
          defaultClassNames.weekday
        ),
        week: cn('fk-mt-2 fk-flex fk-w-full', defaultClassNames.week),
        week_number_header: cn('fk-w-[--cell-size] fk-select-none', defaultClassNames.week_number_header),
        week_number: cn('fk-text-muted-foreground fk-select-none fk-text-[0.8rem]', defaultClassNames.week_number),
        day: cn(
          'fk-group/day fk-relative fk-aspect-square fk-h-full fk-w-full fk-select-none fk-p-0 fk-text-center [&:first-child[data-selected=true]_button]:fk-rounded-l-md [&:last-child[data-selected=true]_button]:fk-rounded-r-md',
          defaultClassNames.day
        ),
        range_start: cn('fk-bg-accent fk-rounded-l-md', defaultClassNames.range_start),
        range_middle: cn('fk-rounded-none', defaultClassNames.range_middle),
        range_end: cn('fk-bg-accent fk-rounded-r-md', defaultClassNames.range_end),
        today: cn(
          'fk-bg-accent fk-text-accent-foreground fk-rounded-md data-[selected=true]:fk-rounded-none',
          defaultClassNames.today
        ),
        outside: cn('fk-text-muted-foreground aria-selected:fk-text-muted-foreground', defaultClassNames.outside),
        disabled: cn('fk-text-muted-foreground fk-opacity-50', defaultClassNames.disabled),
        hidden: cn('fk-invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={cn('fk-size-4', className)} {...props} />;
          }

          if (orientation === 'right') {
            return <ChevronRightIcon className={cn('fk-size-4', className)} {...props} />;
          }

          return <ChevronDownIcon className={cn('fk-size-4', className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="fk-flex fk-size-[--cell-size] fk-items-center fk-justify-center fk-text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'data-[selected-single=true]:fk-bg-primary data-[selected-single=true]:fk-text-primary-foreground data-[range-middle=true]:fk-bg-accent data-[range-middle=true]:fk-text-accent-foreground data-[range-start=true]:fk-bg-primary data-[range-start=true]:fk-text-primary-foreground data-[range-end=true]:fk-bg-primary data-[range-end=true]:fk-text-primary-foreground group-data-[focused=true]/day:fk-border-ring group-data-[focused=true]/day:fk-ring-ring/50 fk-flex fk-aspect-square fk-h-auto fk-w-full fk-min-w-[--cell-size] fk-flex-col fk-gap-1 fk-font-normal fk-leading-none data-[range-end=true]:fk-rounded-md data-[range-middle=true]:fk-rounded-none data-[range-start=true]:fk-rounded-md group-data-[focused=true]/day:fk-relative group-data-[focused=true]/day:fk-z-10 group-data-[focused=true]/day:fk-ring-[3px] [&>span]:fk-text-xs [&>span]:fk-opacity-70',
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
