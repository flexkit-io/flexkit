'use client';

import { useRef, useState, useMemo } from 'react';
import type { JSX } from 'react';
import { LoaderCircle, Search as SearchIcon, X as XIcon } from 'lucide-react';
import { Command as CommandPrimitive } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../core/use-search';
import { cn } from '../lib/utils';
import { Badge } from '../primitives/badge';
import { ButtonGroup } from '../primitives/button-group';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '../primitives/command';
import { ScrollArea } from '../primitives/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
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

const ALL_COLLECTIONS = 'all';

function capitalize(str: string): string {
  const withSpaces = str.replace(/([A-Z])/g, ' $1');

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).trim();
}

function getSearchableEntities(schema: Entity[]): Entity[] {
  return schema.filter((entity) => entity.attributes.some((attr) => attr.searchable));
}

function getCollections(entities: Entity[], selectedCollection: string): string[] {
  if (selectedCollection === ALL_COLLECTIONS) {
    return entities.map((entity) => entity.plural);
  }

  return entities.filter((entity) => entity.plural === selectedCollection).map((entity) => entity.plural);
}

function resolveCollection(entities: Entity[], selectedCollection: string): string {
  if (selectedCollection === ALL_COLLECTIONS) {
    return ALL_COLLECTIONS;
  }

  if (entities.some((entity) => entity.plural === selectedCollection)) {
    return selectedCollection;
  }

  return ALL_COLLECTIONS;
}

function buildSearchRequest(collections: string[], q: string): SearchRequestProps {
  return {
    searchRequests: {
      searches: collections.map((collection) => ({
        collection,
      })),
    },
    commonParams: {
      q,
    },
  };
}

function entityLabel(entity: Entity): string {
  return entity.menu?.label ?? capitalize(entity.plural);
}

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
  const [inputValue, setInputValue] = useState('');
  const [selectedCollection, setSelectedCollection] = useState(ALL_COLLECTIONS);
  const searchableEntities = useMemo(() => getSearchableEntities(schema), [schema]);
  const resolvedCollection = resolveCollection(searchableEntities, selectedCollection);
  const collections = useMemo(
    () => getCollections(searchableEntities, resolvedCollection),
    [searchableEntities, resolvedCollection]
  );
  const searchQuery = useMemo(
    () => buildSearchRequest(collections, inputValue),
    [collections, inputValue]
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading } = useSearch(projectId, searchQuery);
  const showDropdown = isOpen && (results.length > 0 || !isLoading);
  const navigate = useNavigate();

  function handleOnSearchChange(q: string): void {
    setInputValue(q);
    // TODO: Add debounce
    if (q.length > 0) {
      setIsOpen(true);
    }

    if (q.length === 0) {
      setIsOpen(false);
    }

    if (onSearchChange) {
      onSearchChange(q);
    }
  }

  function handleEntityChange(value: string): void {
    setSelectedCollection(value);

    if (inputValue.length > 0) {
      setIsOpen(true);
    }
  }

  function handleClear(): void {
    setInputValue('');
    setIsOpen(false);

    if (inputRef.current) {
      inputRef.current.value = '';
    }

    // Remove id from URL if present
    const url = new URL(window.location.href);

    if (url.searchParams.has('id')) {
      url.searchParams.delete('id');
      navigate(url.pathname + url.search);
    }
  }

  // TODO: handle error

  return (
    <ButtonGroup>
      <Select onValueChange={handleEntityChange} value={resolvedCollection}>
        <SelectTrigger
          aria-label="Filter search by entity"
          className="fk:w-36 fk:h-9 fk:py-1 fk:rounded-r-none fk:border-border fk:shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_COLLECTIONS}>All</SelectItem>
          {searchableEntities.map((entity) => (
            <SelectItem key={entity.plural} value={entity.plural}>
              {entityLabel(entity)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Command
        className="fk:relative fk:overflow-visible fk:h-auto fk:justify-center fk:rounded-none fk:bg-transparent"
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
            'fk:flex fk:items-center fk:border-y fk:border-r fk:border-border fk:rounded-r-md fk:bg-background fk:px-3 fk:h-9 fk:md:w-25 fk:lg:w-75 fk:ring-offset-background',
            'fk:focus-within:outline-hidden fk:focus-within:ring-2 fk:focus-within:ring-ring fk:focus-within:ring-offset-2'
          )}
        >
          {isLoading ? (
            <LoaderCircle className="fk:mr-2 fk:h-4 fk:w-4 fk:shrink-0 fk:opacity-50 fk:animate-spin" />
          ) : (
            <SearchIcon className="fk:mr-2 fk:h-4 fk:w-4 fk:shrink-0 fk:opacity-50" />
          )}
          <CommandPrimitive.Input
            className={cn(
              'fk:flex fk:h-9 fk:w-full fk:rounded-none fk:bg-transparent fk:py-1 fk:text-sm fk:outline-hidden fk:placeholder:text-muted-foreground fk:disabled:cursor-not-allowed fk:disabled:opacity-50',
              className
            )}
            placeholder={searchPlaceholder}
            onMouseDown={() => {
              if ((inputRef.current?.value.length ?? 0) > 0) setIsOpen(true);
            }}
            onValueChange={handleOnSearchChange}
            ref={inputRef}
            value={inputValue}
          />
          {inputValue && (
            <button
              className="fk:flex fk:items-center fk:justify-center fk:ml-2 fk:text-muted-foreground fk:hover:text-foreground"
              onClick={handleClear}
              type="button"
            >
              <XIcon className="fk:h-4 fk:w-4" />
            </button>
          )}
        </div>
        <div className="fk:relative fk:max-w-150">
          <div
            className={cn(
              'fk:mt-1 fk:animate-in fk:fade-in-0 fk:zoom-in-95 fk:absolute fk:top-0 fk:z-50 fk:w-full fk:rounded-md fk:bg-popover fk:outline-hidden fk:drop-shadow-md fk:border fk:border-border',
              showDropdown ? 'fk:block' : 'fk:hidden'
            )}
          >
            <ScrollArea className="fk:max-h-55 fk:overflow-auto">
              {!isLoading && <CommandEmpty>{noResultsMsg}</CommandEmpty>}
              <CommandList>
                <CommandGroup>
                  {results.length > 0 && <CommandItem aria-hidden="true" className="fk:hidden!" value="-" />}
                  {results.map((item) => (
                    <CommandItem
                      className="fk:flex"
                      key={item._id}
                      value={item._id}
                      onSelect={(entityId) => {
                        onSelect({ entityName: item._entityName, entityNamePlural: item._entityNamePlural, entityId });
                      }}
                    >
                      <span className="fk:basis-full">{item[Object.keys(item)[3]]}</span>
                      <Badge className="fk:py-px fk:text-[0.6875rem] fk:leading-3 fk:bg-teal-400">
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
    </ButtonGroup>
  );
}
