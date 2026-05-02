'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { find, propEq } from 'ramda';
import type { ColumnDef } from '@tanstack/react-table';
import { LoaderCircle, Search as SearchIcon, Upload as UploadIcon } from 'lucide-react';
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
import { useUploadAssets } from '../core/upload';

type Props = {
  action: ActionEditRelationship;
  depth: number;
  isFocused: boolean;
};

const PAGE_SIZE = 25;

type SelectedRelationshipRow = {
  id: string;
  value: SingleRelationshipConnection['value'];
};

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
  const {
    assetAccept,
    connectedEntitiesCount,
    connectionName,
    entityId,
    entityName,
    initialAssetPath,
    initialConnection,
    mode,
    relationshipId,
  } = action.payload;
  const { projects, currentProjectId } = useConfig();
  const { schema } = find(propEq(currentProjectId ?? '', 'projectId'))(projects) as SingleProject;
  const entitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const entityNamePlural = entitySchema?.plural ?? '';
  const relationshipContext = relationships[relationshipId];
  const uploadAssets = useUploadAssets();
  const isAssetPicker = entityName === '_asset';
  const entityLabel = isAssetPicker ? 'asset' : (entitySchema?.menu?.label ?? entityName.toLowerCase());
  const selectTitle = isAssetPicker && mode === 'single' ? 'Select asset' : `Select ${isAssetPicker ? 'assets' : entityLabel}`;
  const uploadButtonLabel = mode === 'single' ? 'Upload asset' : 'Upload assets';
  const [searchResultIds, setSearchResultIds] = useState<{ _id: string }[]>([]);

  let initialSingleSelectionState: SelectedRelationshipRow[] = [];

  if (initialConnection) {
    initialSingleSelectionState = [
      {
        id: initialConnection._id,
        value: initialConnection.value,
      },
    ];
  } else if (relationshipContext?.connect) {
    const connection = relationshipContext.connect as SingleRelationshipConnection;

    initialSingleSelectionState = [
      {
        id: connection._id,
        value: connection.value,
      },
    ];
  }

  const initialSelectionState =
    mode === 'single'
      ? initialSingleSelectionState
      : (relationshipContext?.connect as MultipleRelationshipConnection | undefined)?.map((item) => ({
          id: item._id,
          value: item.value,
        })) || [];

  const [selectedRows, setSelectedRows] = useState(initialSelectionState);
  const conditionalWhereClause = useMemo(() => {
    const filterOutConnectedEntities = connectionName
      ? {
          [connectionName]: {
            node: {
              _id: entityId,
            },
          },
        }
      : {};
    const assetPathFilter = isAssetPicker ? { NOT: { path: null } } : {};

    if (mode === 'multiple') {
      return {
        ...assetPathFilter,
        ...filterOutConnectedEntities,
        OR: searchResultIds,
      };
    }

    return {
      ...assetPathFilter,
      OR: searchResultIds,
    };
  }, [connectionName, entityId, isAssetPicker, mode, searchResultIds]);

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
  const hasData = Boolean(data?.length);
  const isInitialLoading = isLoading && !hasData;

  const columns = useGridColumnsDefinition({
    attributesSchema: entitySchema?.attributes ?? [],
    checkboxSelect: mode,
  });
  const loadingData = Array(5).fill({});
  const loadingColumns = getLoadingColumns(columns);

  useEffect(() => {
    if (mode !== 'single' || selectedRows.length > 0 || !initialAssetPath || !data?.length) {
      return;
    }

    const matchedAsset = data.find((row) => row.path === initialAssetPath);

    if (!matchedAsset?._id || typeof matchedAsset._id !== 'string') {
      return;
    }

    setSelectedRows([
      {
        id: matchedAsset._id,
        value: matchedAsset as SingleRelationshipConnection['value'],
      },
    ]);
  }, [data, initialAssetPath, mode, selectedRows.length]);

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
              where: conditionalWhereClause,
            },
          });
        }
      }
    },
    [conditionalWhereClause, connectedEntitiesCount, count, data?.length, fetchMore, isLoading]
  );

  function handleSelection(): void {
    let connect;

    if (mode === 'single') {
      const [selected] = selectedRows;

      connect = {
        _id: selected?.id ?? '',
        value: selected?.value ?? null,
      } as SingleRelationshipConnection;
    }

    if (mode === 'multiple') {
      connect = selectedRows?.map((selected, index) => ({
        _id: selected.id ?? '',
        ...(isAssetPicker ? { sortOrder: index } : {}),
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

  async function handleUploadAssets(): Promise<void> {
    const uploadedAssets = await uploadAssets({
      projectId: currentProjectId,
      accept: assetAccept ?? 'image/*',
      multiple: mode === 'multiple',
      maxBytes: 4 * 1024 * 1024,
    });

    setSelectedRows((currentRows) => {
      if (mode === 'single') {
        const [uploadedAsset] = uploadedAssets;

        return uploadedAsset ? [{ id: uploadedAsset._id, value: uploadedAsset.asset }] : currentRows;
      }

      const selectedIds = new Set(currentRows.map((row) => row.id));
      const nextRows = uploadedAssets
        .filter((uploaded) => !selectedIds.has(uploaded._id))
        .map((uploaded) => ({
          id: uploaded._id,
          value: uploaded.asset,
        }));

      return [...currentRows, ...nextRows];
    });
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
          {!isAssetPicker ? (
            <Button
              className="fk-px-8"
              onClick={() => {
                handleCreateEntity();
              }}
              variant="outline"
            >
              {`Create ${entityLabel}`}
            </Button>
          ) : null}
          {isAssetPicker ? (
            <Button
              className="fk-px-8"
              onClick={() => {
                void handleUploadAssets();
              }}
              variant="outline"
            >
              <UploadIcon className="fk-mr-2 fk-h-4 fk-w-4" />
              {uploadButtonLabel}
            </Button>
          ) : null}
        </>
      }
      depth={depth}
      isFocused={isFocused}
      onClose={() => {
        handleClose(action._id);
      }}
      title={selectTitle}
    >
      <div className="fk-h-[calc(100vh-10rem)] fk-min-h-0">
        <DataTable
          columns={isInitialLoading ? loadingColumns : columns}
          data={isInitialLoading ? loadingData : (data ?? [])}
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
      </div>
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

  const searchRequest = useMemo<SearchRequestProps>(
    () => ({
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
    }),
    [entityNamePlural]
  );
  const [searchQuery, setSearchQuery] = useState(searchRequest);
  const { results, isLoading } = useSearch(projectId, searchQuery);
  const prevResultsRef = useRef<{ _id: string }[] | null>(null);

  const debouncedSetSearchQuery = useMemo(
    () =>
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
    const { value } = e.target;

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
      <Input className="fk-w-full !fk-pl-11" onChange={handleSearchChange} placeholder="Search" value={search} />
    </div>
  );
}

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms = 300): (...args: T) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}
