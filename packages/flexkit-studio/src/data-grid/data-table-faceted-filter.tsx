import * as React from 'react';
import { Check as CheckIcon, CirclePlus as CirclePlusIcon } from 'lucide-react';
import { Column } from '@tanstack/react-table';
import { cn } from '../ui/lib/utils';
import { Badge } from '../ui/primitives/badge';
import { Button } from '../ui/primitives/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/primitives/popover';
import { Separator } from '../ui/primitives/separator';

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as string[]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="fk-h-8 fk-border-dashed">
          <CirclePlusIcon className="fk-mr-2 fk-h-4 fk-w-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="fk-mx-2 fk-h-4" />
              <Badge variant="secondary" className="fk-rounded-sm fk-px-1 fk-font-normal lg:fk-hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="fk-rounded-sm fk-px-1 fk-font-normal">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge variant="secondary" key={option.value} className="fk-rounded-sm fk-px-1 fk-font-normal">
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="fk-w-[200px] fk-p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = Array.from(selectedValues);
                      column?.setFilterValue(filterValues.length ? filterValues : undefined);
                    }}
                  >
                    <div
                      className={cn(
                        'fk-mr-2 fk-flex fk-h-4 fk-w-4 fk-items-center fk-justify-center fk-rounded-sm fk-border fk-border-primary',
                        isSelected ? 'fk-bg-primary fk-text-primary-foreground' : 'fk-opacity-50 [&_svg]:fk-invisible'
                      )}
                    >
                      <CheckIcon className={cn('h-4 w-4')} />
                    </div>
                    {option.icon && <option.icon className="fk-mr-2 fk-h-4 fk-w-4 fk-text-muted-foreground" />}
                    <span>{option.label}</span>
                    {facets?.get(option.value) && (
                      <span className="fk-ml-auto fk-flex fk-h-4 fk-w-4 fk-items-center fk-justify-center fk-font-mono fk-text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className="fk-justify-center fk-text-center"
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
