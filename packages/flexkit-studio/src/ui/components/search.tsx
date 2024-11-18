'use client';

import { useRef, useState, useMemo } from 'react';
import { LoaderCircle, Search as SearchIcon } from 'lucide-react';
import { Command as CommandPrimitive } from 'cmdk';
import { useSearch } from '../../core/use-search';
import { cn } from '../lib/utils';
import { Badge } from '../primitives/badge';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../primitives/command';
import { ScrollArea } from '../primitives/scroll-area';
import type { Entity, SearchRequestProps } from '../../core/types';

export type ComboBoxItemType = {
  value: string;
  label: string;
};

export interface SearchProps {
  onSelect: ({
    entityName,
    entityNamePlural,
    entityId,
  }: {
    entityName: string;
    entityNamePlural: string;
    entityId: string;
  }) => void;
  searchPlaceholder?: string;
  noResultsMsg?: string;
  className?: string;
  onSearchChange?: (e: string) => void;
  projectId: string;
  schema: Entity[];
}

const getBaseSearchRequest = (schema: Entity[]): SearchRequestProps => {
  const collections = schema
    .filter((entity) => entity.attributes.some((attr) => attr.isSearchable))
    .map((entity) => entity.plural);
  const queryBy = schema
    .filter((entity) => entity.attributes.some((attr) => attr.isSearchable))
    .map((entity) =>
      entity.attributes
        .filter((attr) => attr.isSearchable)
        .map((attr) => attr.name)
        .join(',')
    );

  return {
    searchRequests: {
      searches: collections.map((collection, index) => ({
        collection,
        query_by: queryBy[index],
      })),
    },
    commonParams: {
      q: '',
    },
  };
};

export function Search({
  onSelect,
  searchPlaceholder = 'Search...',
  noResultsMsg = 'Nothing found',
  className,
  onSearchChange,
  projectId,
  schema,
}: SearchProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const searchRequest = useMemo(() => getBaseSearchRequest(schema), [schema]);
  const [searchQuery, setSearchQuery] = useState(searchRequest);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading } = useSearch(projectId, searchQuery);

  function handleOnSearchChange(q: string): void {
    // TODO: Add debounce
    if (q.length > 0) {
      setIsOpen(true);
      setSearchQuery({ ...searchRequest, commonParams: { q } });
    }

    if (q.length === 0) setIsOpen(false);

    if (onSearchChange) {
      onSearchChange(q);
    }
  }

  // TODO: handle error

  return (
    <Command
      className="fk-relative fk-overflow-visible fk-h-auto"
      onBlur={() => {
        // close after a delay to allow any click event from the results list to be handled
        setTimeout(() => {
          setIsOpen(false);
        }, 300);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
        }
      }}
      shouldFilter={false}
    >
      <div
        className={cn(
          'fk-flex fk-items-center fk-border fk-border-border fk-rounded-md fk-px-3 fk-h-9 md:fk-w-[100px] lg:fk-w-[300px] fk-ring-offset-background',
          'focus-within:fk-outline-none focus-within:fk-ring-2 focus-within:fk-ring-ring focus-within:fk-ring-offset-2'
        )}
      >
        {isLoading ? (
          <LoaderCircle className="fk-mr-2 fk-h-4 fk-w-4 fk-shrink-0 fk-opacity-50 fk-animate-spin" />
        ) : (
          <SearchIcon className="fk-mr-2 fk-h-4 fk-w-4 fk-shrink-0 fk-opacity-50" />
        )}
        <CommandPrimitive.Input
          className={cn(
            'fk-flex fk-h-9 fk-w-full fk-rounded-md fk-bg-transparent fk-py-1 fk-text-sm fk-outline-none placeholder:fk-text-muted-foreground disabled:fk-cursor-not-allowed disabled:fk-opacity-50',
            className
          )}
          placeholder={searchPlaceholder}
          onMouseDown={() => {
            if ((inputRef.current?.value.length ?? 0) > 0) setIsOpen(true);
          }}
          onValueChange={handleOnSearchChange}
          ref={inputRef}
        />
      </div>
      <div className="fk-relative fk-max-w-[600px]">
        <div
          className={cn(
            'fk-mt-1 fk-animate-in fk-fade-in-0 fk-zoom-in-95 fk-absolute fk-top-0 fk-z-10 fk-w-full fk-rounded-md fk-bg-popover fk-outline-none fk-drop-shadow-md fk-border fk-border-border',
            isOpen ? 'fk-block' : 'fk-hidden'
          )}
        >
          <ScrollArea className="fk-max-h-[220px] fk-overflow-auto">
            <CommandEmpty>{noResultsMsg}</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {results.length > 0 && <CommandItem className="fk-hidden" value="-" />}
                {results.map((item) => (
                  <CommandItem
                    className="fk-flex"
                    key={item._id}
                    value={item._id}
                    onSelect={(entityId) => {
                      onSelect({ entityName: item._entityName, entityNamePlural: item._entityNamePlural, entityId });
                    }}
                  >
                    <span className="fk-basis-full">{item[Object.keys(item)[3]]}</span>
                    <Badge className="fk-py-px fk-text-[0.6875rem] fk-leading-3 fk-bg-teal-400">
                      {item._entityName}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </div>
      </div>
    </Command>
  );
}
