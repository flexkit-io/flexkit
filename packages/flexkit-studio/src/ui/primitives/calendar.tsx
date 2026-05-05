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
        'fk:group/calendar fk:bg-background fk:p-3 fk:[--cell-size:--spacing(8)] fk:in-data-[slot=card-content]:bg-transparent fk:in-data-[slot=popover-content]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn('fk:relative fk:flex fk:flex-col fk:gap-4 fk:md:flex-row', defaultClassNames.months),
        month: cn('fk:flex fk:w-full fk:flex-col fk:gap-4', defaultClassNames.month),
        nav: cn(
          'fk:absolute fk:inset-x-0 fk:top-0 fk:flex fk:w-full fk:items-center fk:justify-between fk:gap-1',
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'fk:size-(--cell-size) fk:p-0 fk:select-none fk:aria-disabled:opacity-50',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'fk:size-(--cell-size) fk:p-0 fk:select-none fk:aria-disabled:opacity-50',
          defaultClassNames.button_next
        ),
        month_caption: cn(
          'fk:flex fk:h-(--cell-size) fk:w-full fk:items-center fk:justify-center fk:px-(--cell-size)',
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          'fk:flex fk:h-(--cell-size) fk:w-full fk:items-center fk:justify-center fk:gap-1.5 fk:text-sm fk:font-medium',
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          'fk:relative fk:rounded-md fk:border fk:border-input fk:shadow-xs fk:has-focus:border-ring fk:has-focus:ring-[3px] fk:has-focus:ring-ring/50',
          defaultClassNames.dropdown_root
        ),
        dropdown: cn('fk:absolute fk:inset-0 fk:bg-popover fk:opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'fk:font-medium fk:select-none',
          captionLayout === 'label'
            ? 'fk:text-sm'
            : 'fk:flex fk:h-8 fk:items-center fk:gap-1 fk:rounded-md fk:pr-1 fk:pl-2 fk:text-sm fk:[&>svg]:size-3.5 fk:[&>svg]:text-muted-foreground',
          defaultClassNames.caption_label
        ),
        table: 'fk:w-full fk:border-collapse',
        weekdays: cn('fk:flex', defaultClassNames.weekdays),
        weekday: cn(
          'fk:flex-1 fk:rounded-md fk:text-[0.8rem] fk:font-normal fk:text-muted-foreground fk:select-none',
          defaultClassNames.weekday
        ),
        week: cn('fk:mt-2 fk:flex fk:w-full', defaultClassNames.week),
        week_number_header: cn('fk:w-(--cell-size) fk:select-none', defaultClassNames.week_number_header),
        week_number: cn('fk:text-[0.8rem] fk:text-muted-foreground fk:select-none', defaultClassNames.week_number),
        day: cn(
          'fk:group/day fk:relative fk:aspect-square fk:h-full fk:w-full fk:p-0 fk:text-center fk:select-none fk:[&:last-child[data-selected=true]_button]:rounded-r-md',
          props.showWeekNumber
            ? 'fk:[&:nth-child(2)[data-selected=true]_button]:rounded-l-md'
            : 'fk:[&:first-child[data-selected=true]_button]:rounded-l-md',
          defaultClassNames.day
        ),
        range_start: cn('fk:rounded-l-md fk:bg-accent', defaultClassNames.range_start),
        range_middle: cn('fk:rounded-none', defaultClassNames.range_middle),
        range_end: cn('fk:rounded-r-md fk:bg-accent', defaultClassNames.range_end),
        today: cn(
          'fk:rounded-md fk:bg-accent fk:text-accent-foreground fk:data-[selected=true]:rounded-none',
          defaultClassNames.today
        ),
        outside: cn('fk:text-muted-foreground fk:aria-selected:text-muted-foreground', defaultClassNames.outside),
        disabled: cn('fk:text-muted-foreground fk:opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={cn('size-4', className)} {...props} />;
          }

          if (orientation === 'right') {
            return <ChevronRightIcon className={cn('size-4', className)} {...props} />;
          }

          return <ChevronDownIcon className={cn('size-4', className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="fk:flex fk:size-(--cell-size) fk:items-center fk:justify-center fk:text-center">
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
        'fk:flex fk:aspect-square fk:size-auto fk:w-full fk:min-w-(--cell-size) fk:flex-col fk:gap-1 fk:leading-none fk:font-normal fk:group-data-[focused=true]/day:relative fk:group-data-[focused=true]/day:z-10 fk:group-data-[focused=true]/day:border-ring fk:group-data-[focused=true]/day:ring-[3px] fk:group-data-[focused=true]/day:ring-ring/50 fk:data-[range-end=true]:rounded-md fk:data-[range-end=true]:rounded-r-md fk:data-[range-end=true]:bg-primary fk:data-[range-end=true]:text-primary-foreground fk:data-[range-middle=true]:rounded-none fk:data-[range-middle=true]:bg-accent fk:data-[range-middle=true]:text-accent-foreground fk:data-[range-start=true]:rounded-md fk:data-[range-start=true]:rounded-l-md fk:data-[range-start=true]:bg-primary fk:data-[range-start=true]:text-primary-foreground fk:data-[selected-single=true]:bg-primary fk:data-[selected-single=true]:text-primary-foreground fk:dark:hover:text-accent-foreground fk:[&>span]:text-xs fk:[&>span]:opacity-70',
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
