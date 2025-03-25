'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { find, propEq } from 'ramda';
import type { ColumnDef } from '@tanstack/react-table';
import { LoaderCircle, Search as SearchIcon } from 'lucide-react';
import { useAppContext, useAppDispatch } from '../core/app-context';
import DrawerModal from '../ui/components/drawer-modal';
import { useConfig } from '../core/config/config-context';
import type { SingleProject } from '../core/config/types';
import { useEntityQuery } from '../graphql-client/use-entity-query';
import type { AttributeValue, MappedEntityItem, EntityItem, ImageValue } from '../graphql-client/types';
import { useGridColumnsDefinition } from '../data-grid/columns';
import { DataTable } from '../data-grid/data-table';
import { Button } from '../ui/primitives/button';
import { Input } from '../ui/primitives/input';
import { Skeleton } from '../ui/primitives/skeleton';
import type {
  Entity,
  SingleRelationshipConnection,
  MultipleRelationshipConnection,
  SearchRequestProps,
} from '../core/types';
import { useDispatch } from './actions-context';
import { type Action, type ActionEditRelationship } from './types';
import { useSearch } from '../core/use-search';

type Props = {
  action: ActionEditRelationship;
  depth: number;
  isFocused: boolean;
};

const PAGE_SIZE = 25;

function getLoadingColumns(columns: object[]): ColumnDef<AttributeValue>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk-h-4 fk-w-full" style={{ marginTop: '7px', marginBottom: '6px' }} />,
  })) as unknown as ColumnDef<AttributeValue>[];
}

export default function EditRelationship({ action, depth, isFocused }: Props): JSX.Element {
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { relationships, scope } = useAppContext();
  const { connectedEntitiesCount, connectionName, entityId, entityName, mode, relationshipId } = action.payload;
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const entityLabel = entitySchema?.menu?.label ?? entityName.toLowerCase();
  const entityNamePlural = entitySchema?.plural ?? '';
  const relationshipContext = relationships[relationshipId];
  const [searchResultIds, setSearchResultIds] = useState<{ _id: string }[]>([]);

  const initialSelectionState =
    mode === 'single'
      ? relationshipContext?.connect
        ? [
            {
              id: (relationshipContext.connect as SingleRelationshipConnection)._id,
              value: (relationshipContext.connect as SingleRelationshipConnection).value,
            },
          ]
        : []
      : (relationshipContext?.connect as MultipleRelationshipConnection | undefined)?.map((item) => ({
          id: item._id,
          value: item.value,
        })) || [];

  const [selectedRows, setSelectedRows] = useState(initialSelectionState);
  const filterOutConnectedEntities = connectionName
    ? {
        [connectionName]: {
          node: {
            _id: entityId,
          },
        },
      }
    : {};
  const conditionalWhereClause =
    mode === 'multiple'
      ? {
          ...filterOutConnectedEntities,
          OR: searchResultIds,
        }
      : {
          OR: searchResultIds,
        };

  const { count, data, fetchMore, isLoading } = useEntityQuery({
    entityNamePlural,
    schema,
    scope,
    variables: {
      options: {
        offset: 0,
        limit: PAGE_SIZE,
      },
      where: conditionalWhereClause,
    },
  });

  const columns = useGridColumnsDefinition({
    attributesSchema: entitySchema?.attributes ?? [],
    checkboxSelect: mode,
  });
  const loadingData = Array(5).fill({});
  const loadingColumns = getLoadingColumns(columns);

  const handleClose = useCallback(
    (_id: Action['_id']) => {
      actionDispatch({ type: 'Dismiss', _id, payload: {} });
    },
    [actionDispatch]
  );

  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      const rowsCount = data?.length ?? 0;
      const totalCount = count - connectedEntitiesCount;

      if (containerRefElement && totalCount > 0 && rowsCount > 0) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (scrollHeight - scrollTop - clientHeight < 500 && !isLoading && rowsCount < totalCount) {
          fetchMore({
            variables: {
              options: {
                offset: rowsCount,
                limit: PAGE_SIZE,
              },
            },
          });
        }
      }
    },
    [connectedEntitiesCount, count, data?.length, fetchMore, isLoading]
  );

  function handleSelection(): void {
    let connect;

    if (mode === 'single') {
      const selected = selectedRows[0];

      connect = {
        _id: selected.id ?? '',
        value: selected.value,
      } as SingleRelationshipConnection;
    }

    if (mode === 'multiple') {
      connect = selectedRows?.map((selected) => ({
        _id: selected.id ?? '',
        value: selected.value,
      })) as MultipleRelationshipConnection;
    }

    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect,
          disconnect: relationshipContext?.disconnect ?? [],
        },
      },
    });
    handleClose(action._id);
  }

  function handleSelectionChange(selectedIds: string[]): void {
    if (mode === 'multiple') {
      // Keep existing selections that are still selected (in selectedIds)
      // and add new selections
      setSelectedRows((prevSelected) => {
        // Create a map of existing selections for quick lookup
        const existingSelections = new Map(prevSelected.map((item) => [item.id, item]));

        // Process each selectedId
        return selectedIds.map((id) => {
          // If we already have this item selected, keep the existing data
          if (existingSelections.has(id)) {
            return existingSelections.get(id)!;
          }

          // Otherwise find it in the current data and add it
          const valueFromData = data?.find((row) => row._id === id);
          return {
            id,
            value: valueFromData as unknown as
              | string
              | AttributeValue
              | MappedEntityItem
              | EntityItem
              | ImageValue
              | null
              | undefined,
          };
        });
      });

      return;
    }

    // if single, get only the last selected row
    const selected = selectedIds[selectedIds.length - 1];
    if (selected) {
      setSelectedRows((prevSelected) => {
        // If we already have this item selected, keep the existing data
        if (prevSelected.length === 1 && prevSelected[0].id === selected) {
          return prevSelected;
        }

        // Otherwise find it in the current data
        const valueFromData = data?.find((row) => row._id === selected);
        return [
          {
            id: selected,
            value: valueFromData as unknown as
              | string
              | AttributeValue
              | MappedEntityItem
              | EntityItem
              | ImageValue
              | null
              | undefined,
          },
        ];
      });
    } else {
      // No selection
      setSelectedRows([]);
    }
  }

  function handleCreateEntity(): void {
    actionDispatch({ type: 'AddEntity', payload: { entityName } });
  }

  return (
    <DrawerModal
      actions={
        <>
          <Button
            className="fk-px-8"
            onClick={() => {
              handleSelection();
            }}
            variant="default"
          >
            Select
          </Button>
          <Button
            className="fk-px-8"
            onClick={() => {
              handleCreateEntity();
            }}
            variant="outline"
          >
            {`Create ${entityLabel}`}
          </Button>
        </>
      }
      depth={depth}
      isFocused={isFocused}
      onClose={() => {
        handleClose(action._id);
      }}
      title={`Select ${entityLabel}`}
    >
      <DataTable
        columns={isLoading ? loadingColumns : columns}
        data={isLoading ? loadingData : (data ?? [])}
        entityName={entitySchema?.name ?? ''}
        initialSelectionState={
          selectedRows?.reduce(
            (acc, selected) => ({ ...acc, ...(selected.id ? { [selected.id]: true } : {}) }),
            {}
          ) as {
            [_id: string]: boolean;
          }
        }
        onEntitySelectionChange={handleSelectionChange}
        onScroll={(e) => {
          fetchMoreOnBottomReached(e.target as HTMLDivElement);
        }}
        toolbarComponent={() => (
          <SearchBar
            entityNamePlural={entityNamePlural}
            projectId={currentProjectId ?? ''}
            setSearchResultIds={setSearchResultIds}
          />
        )}
      />
    </DrawerModal>
  );
}

function SearchBar({
  entityNamePlural,
  projectId,
  setSearchResultIds,
}: {
  entityNamePlural: string;
  projectId: string;
  setSearchResultIds: (ids: { _id: string }[]) => void;
}): JSX.Element {
  const [search, setSearch] = useState('');

  function getBaseSearchRequest(): SearchRequestProps {
    return {
      searchRequests: {
        searches: [
          {
            collection: entityNamePlural,
          },
        ],
      },
      commonParams: {
        q: '',
      },
    };
  }

  const searchRequest = getBaseSearchRequest();
  const [searchQuery, setSearchQuery] = useState(searchRequest);
  const { results, isLoading } = useSearch(projectId, searchQuery);
  const prevResultsRef = useRef<any[] | null>(null);

  const debouncedSetSearchQuery = useCallback(
    debounce((query: string) => {
      setSearchQuery({
        ...searchRequest,
        commonParams: { q: query },
      });
    }, 300),
    [searchRequest]
  );

  useEffect(() => {
    if (results) {
      const currentResultsString = JSON.stringify(results.map((r) => r._id).sort());
      const prevResultsString = prevResultsRef.current
        ? JSON.stringify(prevResultsRef.current.map((r) => r._id).sort())
        : '';

      if (currentResultsString !== prevResultsString) {
        prevResultsRef.current = [...results];
        setSearchResultIds(results.map((result) => ({ _id: result._id })));
      }
    }
  }, [results, setSearchResultIds]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const value = e.target.value;
    setSearch(value);
    debouncedSetSearchQuery(value);
  }

  return (
    <div className="fk-relative fk-w-full">
      {isLoading ? (
        <LoaderCircle className="fk-absolute fk-left-4 fk-top-3 fk-h-4 fk-w-4 fk-shrink-0 fk-opacity-50 fk-animate-spin" />
      ) : (
        <SearchIcon className="fk-absolute fk-left-4 fk-top-3 fk-h-4 fk-w-4 fk-shrink-0 fk-opacity-50" />
      )}
      <Input className="fk-w-full fk-pl-11" onChange={handleSearchChange} placeholder="Search" value={search} />
    </div>
  );
}

function debounce(fn: Function, ms = 300) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}
