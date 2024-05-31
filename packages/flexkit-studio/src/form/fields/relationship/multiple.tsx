import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { RefObject, SyntheticEvent } from 'react';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { useLazyQuery, gql } from '@apollo/client';
import type { ColumnDef } from '@tanstack/react-table';
import { find, map, prop, propEq, set, uniq, uniqBy } from 'ramda';
import { Link, Maximize2, X as ClearIcon } from 'lucide-react';
import { getRelatedItemsQuery, mapRelatedItemsQueryResult } from '../../../graphql-client/queries';
import type { EntityItem, EntityQueryResults } from '../../../graphql-client/types';
import { gridColumnsDefinition } from '../../../data-grid/columns';
import { DataTable } from '../../../data-grid/data-table';
import { Button } from '../../../ui/primitives/button';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../../ui/primitives/form';
import { Skeleton } from '../../../ui/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/primitives/tooltip';
import { Badge } from '../../../ui/primitives/badge';
import { Collapsible, CollapsibleContent } from '../../../ui/primitives/collapsible';
import type {
  ActionSetRelationship,
  Attribute,
  Entity,
  Relationships,
  RelationshipConnection,
} from '../../../core/types';
import { useDispatch } from '../../../entities/actions-context';
import { useAppContext, useAppDispatch } from '../../../core/app-context';
import { ActionType, type Action } from '../../../entities/types';
import type { FormFieldParams } from '../../types';
import { DataTableRowActions } from './data-table-row-actions';

const PAGE_SIZE = 25;
const AVAILABLE_PAGE_SIZES = [25, 50, 100];

export default function MultipleRelationship({
  control,
  defaultValue,
  entityId,
  entityName,
  entityNamePlural,
  fieldSchema,
  getValues,
  schema,
  scope,
  setValue,
}: FormFieldParams): JSX.Element {
  // eslint-disable-next-line no-console -- temporary debug
  console.log('Relationship component reloaded');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOuterClick(wrapperRef, setIsOpen);
  const [rows, setRows] = useState<EntityItem[] | []>([]);
  const [rowCount, setRowCount] = useState(defaultValue.count ?? 0);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: PAGE_SIZE,
    page: 0,
  });
  const { name, label, options, relationship } = fieldSchema;
  const relationshipEntityName: string = relationship?.entity ?? name;
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { relationships } = useAppContext();
  const relationshipId = useId();
  const relationshipEntitySchema = find(propEq(relationshipEntityName, 'name'))(schema) as Entity | undefined;
  const relationshipEntityAttributesSchema = relationshipEntitySchema?.attributes ?? [];
  const baseEntitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const baseEntityAttributesSchema = baseEntitySchema?.attributes ?? [];
  const relationshipMode = find<Attribute>(propEq(entityName, 'name'))(relationshipEntityAttributesSchema)?.relationship
    ?.mode;
  const parentEntityRelationshipMode = find<Attribute>(propEq(name, 'name'))(baseEntityAttributesSchema)?.relationship
    ?.mode;

  // name of the entity used to filter out the related items already connected when showing the list (i.e. productsConnection_NONE)
  const connectionName =
    (relationshipMode ?? parentEntityRelationshipMode) === 'single'
      ? `${entityName}Connection_NOT`
      : `${entityNamePlural}Connection_NONE`;

  const primaryAttributeName = getPrimaryAttributeName(relationshipEntityAttributesSchema);
  const initialRows = useMemo(
    () =>
      relationship && relationship.mode === 'multiple' && defaultValue.value
        ? dataAdapter({ data: defaultValue.value, primaryAttributeName, relationshipEntitySchema, scope }) ?? []
        : [],
    [defaultValue, primaryAttributeName, relationshipEntitySchema, relationship, scope]
  );
  const entityQuery = getRelatedItemsQuery(name, entityName, relationshipEntityName, scope, schema);
  const previewItems = rows.length ? rows.slice(0, 12).map((row) => row[primaryAttributeName]) : [];
  const [getData, { loading, data }] = useLazyQuery<EntityItem[] | []>(gql`
    ${entityQuery.query}
  `);

  const columns = useMemo(
    () =>
      gridColumnsDefinition({
        attributesSchema: relationshipEntitySchema?.attributes ?? [],
        actionsComponent: (row) => dataRowActions({ appDispatch, relationshipId, relationships, row, setRows }),
      }),
    [appDispatch, relationshipEntitySchema?.attributes, relationshipId, relationships]
  );
  const loadingData = Array(5).fill({});
  const loadingColumns = getLoadingColumns(columns);

  type Field =
    | string
    | {
        default: string;
        [key: string]: string | undefined;
      };

  useEffect(() => {
    setRows(initialRows);

    if (defaultValue.value === '') {
      return;
    }

    const scopedValue = (field: Field): string => {
      if (typeof field === 'string') {
        return field;
      }

      return field[scope] ?? field.default;
    };
    const preexistentConnections = Array.isArray(defaultValue.value)
      ? defaultValue.value.map((row) => ({ _id: String(row._id), value: map(scopedValue, row) }))
      : { _id: String(defaultValue._id), value: defaultValue.value };

    // set the initial state of the relationship
    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect: [],
          disconnect: [],
        },
      },
    });
  }, [appDispatch, data, initialRows, relationshipId, defaultValue, scope]);

  useEffect(() => {
    if (data) {
      // pagination occured, assign the query results to the rows state
      const mappedResults = mapRelatedItemsQueryResult(entityName, relationshipEntityName, scope, data, schema);
      setRows(mappedResults.results); // TODO: merge with existing rows
    }
  }, [data, entityName, schema, relationshipEntityName, scope]);

  /**
   * Update the value of the relationship attribute when the relationshp context value changes
   * The relationshp context value changes when the user selects a row from the datagrid in the EditRelationship modal
   */
  useEffect(() => {
    setValue(name, { value: relationships[relationshipId] });

    // const connectedRows = relationships[relationshipId]?.connect?.map(({ value }) => value) ?? [];
    // const initialValues = defaultValue?.value?.map((row) => ({
    //   ...row,
    //   [primaryAttributeName]: row?.[primaryAttributeName]?.[scope] ?? '',
    // }));
    // const updatedRows = uniqBy(prop('_id'), [...connectedRows, ...initialValues]).filter(
    //   (row) => !relationships[relationshipId]?.disconnect?.includes(row._id)
    // );
    // console.log('disconnect', relationships[relationshipId]?.disconnect);
    // console.log({ updatedRows });
    // setRows(updatedRows);
  }, [
    defaultValue.value,
    primaryAttributeName,
    relationships,
    relationshipId,
    relationship?.mode,
    scope,
    setValue,
    name,
  ]);

  /**
   * Multiple mode
   * Set the value of the rows for the datagrid
   */
  useEffect(() => {
    const connections = Array.isArray(relationships[relationshipId]?.connect)
      ? relationships[relationshipId]?.connect
      : [];
    const selectedRows = connections.map(({ value }) => value);
    const totalCount = paginationModel.pageSize * (paginationModel.page + 1);
    const limit =
      totalCount - selectedRows.length > paginationModel.pageSize
        ? paginationModel.pageSize
        : totalCount - selectedRows.length;
    // TODO: finish the functionality to merge the existing rows with the new ones and paginate them
    if (limit > 0) {
      // eslint-disable-next-line no-console -- temporary debug
      console.log('Limit is greater than zero');
    }
    if (limit <= 0) {
      // eslint-disable-next-line no-console -- temporary debug
      console.log('No need to fetch more records');
      setRows((prevRows) =>
        uniqBy(prop('_id'), [...(selectedRows as []), ...prevRows]).slice(
          paginationModel.page * paginationModel.pageSize,
          paginationModel.pageSize
        )
      );
      return;
    }

    if (data) {
      const updatedRows = uniqBy(prop('_id'), [...(selectedRows as []), ...data]);
      setRows(updatedRows);
      setRowCount(updatedRows.length);

      return;
    }

    setRows(uniqBy(prop('_id'), [...(selectedRows as []), ...initialRows]));
  }, [
    data,
    defaultValue.count,
    initialRows,
    paginationModel.page,
    paginationModel.pageSize,
    relationships,
    relationshipId,
  ]);

  // const disconnectEntity: ({ _entityId }: Action['payload']) => () => void = useCallback(
  //   ({ entityId }: Action['payload']) =>
  //     () => {
  //       const rowToDeleteWasJustConnected = find(propEq('_id', entityId), relationships[relationshipId]?.connect ?? []);
  //       const shouldUndoDisconnection = relationships[relationshipId]?.disconnect?.includes(entityId);
  //       const disconnection = rowToDeleteWasJustConnected
  //         ? relationships[relationshipId]?.disconnect
  //         : uniq([...(relationships[relationshipId]?.disconnect ?? []), entityId]);

  //       if (rowToDeleteWasJustConnected) {
  //         setRows((rows) => rows.filter((row) => row?._id !== entityId));
  //       }

  //       appDispatch({
  //         type: 'setRelationship',
  //         payload: {
  //           [relationshipId]: {
  //             connect: relationships[relationshipId]?.connect?.filter((row) => row?._id !== entityId) ?? [],
  //             disconnect: shouldUndoDisconnection
  //               ? relationships[relationshipId]?.disconnect?.filter((_id) => _id !== entityId) ?? []
  //               : disconnection,
  //           },
  //         },
  //       });
  //     },
  //   [appDispatch, relationshipId, relationships]
  // );

  function handleSelection(event: SyntheticEvent): void {
    event.preventDefault();
    actionDispatch({
      type: ActionType.EditRelationship,
      payload: {
        entityName: relationshipEntityName,
        entityId,
        relationshipId,
        connectionName,
        mode: relationship?.mode ?? 'multiple',
      },
    });
  }

  function handlePaginationChange(model: GridPaginationModel): void {
    setPaginationModel(model);

    if (relationship.mode === 'multiple') {
      fetchRelatedRows({
        connections: relationships[relationshipId]?.connect ?? [],
        paginationModel: model,
        getData,
        entityName,
        _id: getValues()._id.value,
      });
    }
  }

  function handleClearingSingle(event: SyntheticEvent): void {
    const action: ActionSetRelationship = {
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect: [],
          disconnect: [],
        },
      },
    };

    event.preventDefault();
    setValue(name, '');

    if (data) {
      // this is an edit form, let's disconnect the relationship
      action.payload[relationshipId] = {
        connect: [],
        disconnect: relationships[relationshipId]?.disconnect ?? [],
      };
    }

    appDispatch(action);
  }

  return (
    <FormField
      control={control}
      defaultValue={defaultValue}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl className="fk-flex fk-flex-col fk-w-full fk-min-h-[2.375rem] fk-pl-3 fk-pr-10 fk-py-0.5 fk-text-sm">
            <div
              aria-controls="relationship-dropdown"
              aria-expanded={isOpen}
              className={`fk-relative fk-flex fk-w-full fk-items-start fk-space-x-2 fk-rounded-md fk-border fk-border-input fk-bg-background focus-visible:fk-outline-none focus-visible:fk-ring-2 focus-visible:fk-ring-ring focus-visible:fk-ring-offset-2 ${
                isOpen ? 'fk-outline-none fk-ring-2 fk-ring-ring fk-ring-offset-2' : ''
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                wrapperRef.current?.focus();
                wrapperRef.current?.click();
                setIsOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsOpen(true);
                }
              }}
              ref={wrapperRef}
              role="combobox"
              tabIndex={0}
            >
              <div className="fk-flex fk-w-full fk-space-x-2">
                {!isOpen ? (
                  <span className="fk-flex fk-flex-wrap fk-grow fk-pb-1.5">
                    {previewItems.map((item) => (
                      <Badge className="fk-mr-2 fk-mt-1.5 fk-rounded-sm" key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <Button className="fk-h-8 fk-mr-auto fk-mt-2" onClick={handleSelection} variant="outline">
                    <Link className="fk-h-4 fk-w-4 fk-mr-2" /> Link to a record from {relationshipEntitySchema?.plural}
                  </Button>
                )}
                {!isOpen ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="fk-absolute fk-right-[0.1875rem] fk-top-[0.1875rem] fk-h-8 fk-w-8 fk-rounded fk-text-muted-foreground"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              wrapperRef.current?.focus();
                              wrapperRef.current?.click();
                            }
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <Maximize2 className="fk-h-4 fk-w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Expand field</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="fk-absolute fk-right-[0.1875rem] fk-top-[0.1875rem] fk-h-8 fk-w-8 fk-rounded fk-text-muted-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            wrapperRef.current?.blur();
                            setIsOpen(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              wrapperRef.current?.blur();
                              setIsOpen(false);
                            }
                          }}
                          size="icon"
                          variant="ghost"
                        >
                          <ClearIcon className="fk-h-4 fk-w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Close</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <Collapsible className="fk-w-full fk-space-y-2 !fk-ml-0" onOpenChange={setIsOpen} open={isOpen}>
                <CollapsibleContent className="fk-w-full">
                  <div className="fk-flex fk-w-full fk-mt-3 fk-mb-2" id="relationship-dropdown">
                    <DataTable
                      columns={loading ? loadingColumns : columns}
                      data={loading ? loadingData : rows}
                      entityName={entityName}
                      rowDeletionState={relationships[relationshipId]?.disconnect}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function dataRowActions({ appDispatch, relationshipId, relationships, row, setRows }): JSX.Element {
  function disconnectEntity(entityId: string): void {
    const rowToDeleteWasJustConnected =
      typeof find(propEq(entityId, '_id'), relationships[relationshipId]?.connect ?? []) === 'object';

    const shouldUndoDisconnection = relationships[relationshipId]?.disconnect?.includes(entityId);
    const disconnection = rowToDeleteWasJustConnected
      ? relationships[relationshipId]?.disconnect
      : uniq([...(relationships[relationshipId]?.disconnect ?? []), entityId]);

    if (rowToDeleteWasJustConnected) {
      setRows((rows) => rows.filter((row) => row?._id !== entityId));
    }

    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect: relationships[relationshipId]?.connect?.filter((row) => row?._id !== entityId) ?? [],
          disconnect: shouldUndoDisconnection
            ? relationships[relationshipId]?.disconnect?.filter((_id) => _id !== entityId) ?? []
            : disconnection,
        },
      },
    });
  }

  return <DataTableRowActions action={disconnectEntity} row={row} />;
}

function getLoadingColumns(columns: object[]): ColumnDef<unknown>[] {
  return columns.map((column) => ({
    ...column,
    cell: () => <Skeleton className="fk-h-4 fk-w-full" />,
  })) as unknown as ColumnDef<unknown>[];
}

/**
 * Find the name of the attribute of an entity with isPrimary === true.
 * The value of that attribute is returned as the value for the relationship attribute
 */
function getPrimaryAttributeName(schemaAttributes: Attribute[]): string {
  return schemaAttributes.find((attr) => attr.isPrimary)?.name ?? schemaAttributes?.[0]?.name ?? '';
}

type DataAdapter = {
  data?: EntityQueryResults[];
  primaryAttributeName: string;
  relationshipEntitySchema: Entity | undefined;
  scope: string;
};

function dataAdapter({ data, primaryAttributeName, relationshipEntitySchema, scope }: DataAdapter): [] | undefined {
  return data?.map((row) =>
    map((field) => {
      if (typeof field === 'object' && field.__typename) {
        const relationshipFieldSchema = find(propEq(field.__typename, 'name'))(
          relationshipEntitySchema?.attributes ?? []
        ) as Attribute;
        const relationshipFieldName = relationshipFieldSchema?.relationship?.field ?? '';

        if (relationshipFieldName) {
          return field[relationshipFieldName];
        }

        return field?.[scope] ?? field?.default;
      }

      if (Array.isArray(field)) {
        return field
          .slice(0, 3)
          .map((item) => item[primaryAttributeName]?.[scope] ?? item[primaryAttributeName]?.default)
          .join(', ');
      }

      return field;
    }, row)
  );
}

function getRowClassName(_id: string, relationshipId: string, relationships: Relationships): string {
  const isAdding = find(propEq('_id', _id))(relationships[relationshipId]?.connect || []);
  const isRemoving = relationships[relationshipId]?.disconnect?.includes(_id);

  if (isAdding) {
    return 'add-relationship';
  }

  if (isRemoving) {
    return 'remove-relationship';
  }

  return '';
}

type FetchRelatedRowsParams = {
  connections: RelationshipConnection[];
  paginationModel: {
    pageSize: number;
    page: number;
  };
  getData: Function;
  entityName: string;
  _id: string | number | boolean | [];
};

function fetchRelatedRows({ connections, paginationModel, getData, entityName, _id }: FetchRelatedRowsParams): void {
  const selectedRows = connections.map(({ row }) => row);
  const totalCount = paginationModel.pageSize * (paginationModel.page + 1);
  const limit =
    totalCount - selectedRows.length > paginationModel.pageSize
      ? paginationModel.pageSize
      : totalCount - selectedRows.length;
  let offset = paginationModel.pageSize * paginationModel.page - selectedRows.length;
  // eslint-disable-next-line no-console -- temporary debug
  console.log({ paginationModel }, selectedRows.length);
  offset = offset < 0 ? 0 : offset;

  if (limit > 0) {
    // eslint-disable-next-line no-console -- temporary debug
    console.log(`Fetch ${limit} records starting from ${offset}`);
    getData({
      variables: {
        where: {
          _id,
        },
        options: {
          offset,
          limit,
        },
      },
    });
  }

  if (limit <= 0) {
    // eslint-disable-next-line no-console -- temporary debug
    console.log('No need to fetch more records');
    // setRows((prevRows) =>
    //   uniqBy(prop('_id'), [...(selectedRows as []), ...prevRows]).slice(
    //     pageIndex * pageSize,
    //     pageSize
    //   )
    // );

    return;
  }

  // setRowCount(selectedRows.length + defaultValue?.count);
  // setRows((prevRows) => uniqBy(prop('_id'), [...(selectedRows as []), ...prevRows]));
}

function useOuterClick(ref: RefObject<HTMLDivElement>, callback: React.Dispatch<React.SetStateAction<boolean>>): void {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [callback, ref]);

  useEffect(() => {
    function handleFocusOutside(event: FocusEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback(false);
      }
    }

    document.addEventListener('focusin', handleFocusOutside);

    return () => {
      document.removeEventListener('mousedown', handleFocusOutside);
    };
  }, [callback, ref]);
}
