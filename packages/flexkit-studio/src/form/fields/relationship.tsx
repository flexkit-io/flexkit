import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import { useLazyQuery, gql } from '@apollo/client';
import { find, map, prop, propEq, set, uniq, uniqBy } from 'ramda';
import { ChevronsUpDown, Link, X as ClearIcon } from 'lucide-react';
import { getRelatedItemsQuery, mapRelatedItemsQueryResult } from '../../graphql-client/queries';
import type { EntityItem, EntityQueryResults, FormScopedAttributeValue } from '../../graphql-client/types';
import { Button } from '../../ui/primitives/button';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../ui/primitives/form';
import { Input } from '../../ui/primitives/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/primitives/tooltip';
import { Badge } from '../../ui/primitives/badge';
import { Collapsible, CollapsibleContent } from '../../ui/primitives/collapsible';
import type { ActionSetRelationship, Attribute, Entity, Relationships, RelationshipConnection } from '../../core/types';
import { useDispatch } from '../../entities/actions-context';
import { useAppContext, useAppDispatch } from '../../core/app-context';
import type { Action } from '../../entities/types';
import type { FormFieldParams } from '../types';

const PAGE_SIZE = 25;
const AVAILABLE_PAGE_SIZES = [25, 50, 100];

export default function Relationship({
  control,
  defaultValue,
  entityId,
  entityName,
  fieldSchema,
  getValues,
  schema,
  scope,
  setValue,
}: FormFieldParams): JSX.Element {
  // eslint-disable-next-line no-console -- temporary debug
  console.log('Relationship component reloaded');
  const [isOpen, setIsOpen] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [rows, setRows] = useState<EntityItem[] | []>([]);
  const [rowCount, setRowCount] = useState(defaultValue?.count ?? 0);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: PAGE_SIZE,
    page: 0,
  });
  const { name, label, options, relationship } = fieldSchema;
  const relationshipEntity: string = relationship?.entity ?? name;
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { relationships } = useAppContext();
  const relationshipId = useId();
  const relationshipEntitySchema = find(propEq(relationshipEntity, 'name'))(schema) as Entity | undefined;
  const primaryAttributeName = getPrimaryAttributeName(relationshipEntitySchema?.attributes ?? []);
  const initialRows = useMemo(
    () =>
      relationship.mode === 'multiple' && defaultValue?.value
        ? dataAdapter({ data: defaultValue?.value, relationshipEntitySchema, scope }) || []
        : [],
    [defaultValue, relationshipEntitySchema, relationship.mode, scope]
  );
  const entityQuery = getRelatedItemsQuery(name, entityName, relationshipEntity, scope, schema);
  const previewItems = rows.length ? rows.slice(0, 12).map((row) => row[primaryAttributeName]) : [];
  const [getData, { loading, data }] = useLazyQuery(gql`
    ${entityQuery.query}
  `);

  useEffect(() => {
    setRows(initialRows);

    if (!data) return;

    const scopedValue = (field: { field: { [key: string]: string } | string }): string =>
      field?.[scope] ?? field?.default ?? field;
    const preexistentConnections = Array.isArray(defaultValue?.value)
      ? defaultValue.value.map((row) => ({
          _id: row._id,
          value: map(scopedValue, row),
        }))
      : { _id: defaultValue._id, value: defaultValue.value };

    // set the initial state of the relationship
    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect: preexistentConnections,
          disconnect: [],
        },
      },
    });
  }, [appDispatch, data, initialRows, relationshipId, defaultValue, scope]);

  useEffect(() => {
    if (data) {
      // pagination occured, assign the query results to the rows state
      const mappedResults = mapRelatedItemsQueryResult(entityName, relationshipEntity, scope, data, schema);
      setRows(mappedResults.results); // TODO: merge with existing rows
    }
  }, [data, entityName, schema, relationshipEntity, scope]);

  /**
   * Update the value of the relationship attribute when the relationshp context value changes
   * The relationshp context value changes when the user selects a row from the datagrid in the EditRelationship modal
   */
  useEffect(() => {
    console.log({ relationships });
    if (relationship?.mode === 'single' && relationships[relationshipId]?.connect?._id) {
      setValue(name, relationships[relationshipId].connect);

      return;
    }

    if (relationship?.mode === 'multiple' && relationships[relationshipId]?.connect?.length) {
      setValue(name, relationships[relationshipId].connect);
    }
  }, [relationships, relationshipId, relationship?.mode, setValue, name]);

  /**
   * Multiple mode
   * Set the value of the rows for the datagrid
   */
  useEffect(() => {
    if (relationship?.mode !== 'multiple') {
      return;
    }

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
    setRowCount(selectedRows.length + (defaultValue?.count ?? 0));
    setRows((prevRows) => uniqBy(prop('_id'), [...(selectedRows as []), ...prevRows]));
  }, [defaultValue?.count, initialRows, paginationModel.page, paginationModel.pageSize, relationships, relationshipId]);

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

  const columns = useMemo(
    () =>
      [][
        // gridColumnsDefinitions({
        //   entityName: name,
        //   actions: [
        //     {
        //       action: disconnectEntity,
        //       icon: <CloseIcon />,
        //       label: 'Disconnect',
        //     },
        //   ],
        //   entitySchema: relationshipEntitySchema?.attributes ?? [],
        // }),
        (name, relationshipEntitySchema)
      ]
  );

  function handleSelection(event: SyntheticEvent): void {
    event.preventDefault();
    actionDispatch({
      type: 'editRelationship',
      payload: {
        entityName: relationshipEntity,
        entityId,
        relationshipId,
        mode: relationship?.mode ?? 'single',
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
    <>
      {relationship?.mode === 'multiple' ? (
        <FormField
          control={control}
          defaultValue={defaultValue}
          name={name}
          render={() => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
              <FormControl className="fk-flex fk-flex-col fk-w-full fk-min-h-10 fk-px-3 fk-py-1 fk-text-sm">
                <>
                  <div className="fk-flex fk-w-full fk-items-start fk-space-x-2">
                    <Button
                      className="fk-grow fk-h-auto fk-min-h-[2.5rem] fk-rounded-md fk-border fk-border-input fk-bg-background hover:fk-bg-background fk-ring-offset-background focus:fk-outline-none focus:fk-ring-2 focus:fk-ring-ring focus:fk-ring-offset-2 disabled:fk-cursor-not-allowed disabled:fk-opacity-50"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsOpen((prev) => !prev);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <span className="fk-flex fk-flex-wrap fk-grow fk-pb-1.5">
                        {previewItems.map((item) => (
                          <Badge className="fk-mr-2 fk-mt-1.5 fk-rounded-sm" key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </span>
                      <ChevronsUpDown className="fk-h-4 fk-w-4 fk-stroke-muted-foreground" />
                    </Button>
                    <Button className="fk-h-10 fk-w-10" onClick={handleSelection} size="icon" variant="outline">
                      <Link className="fk-h-4 fk-w-4" />
                    </Button>
                  </div>
                  <Collapsible className="fk-w-full fk-space-y-2" onOpenChange={setIsOpen} open={isOpen}>
                    <CollapsibleContent>
                      <div className="fk-flex fk-w-full">
                        <div>Datagrid here...</div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={control}
          defaultValue={defaultValue}
          name={name}
          render={({ field }: { field: { value?: FormScopedAttributeValue } }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
              <FormControl className="fk-flex fk-w-full fk-items-center fk-space-x-2">
                {/* <Button
                  className="fk-grow fk-h-auto fk-min-h-[2.5rem] fk-rounded-md fk-border fk-border-input fk-bg-background hover:fk-bg-background fk-ring-offset-background focus:fk-outline-none focus:fk-ring-2 focus:fk-ring-ring focus:fk-ring-offset-2 disabled:fk-cursor-not-allowed disabled:fk-opacity-50"
                  onClick={handleSelection}
                  size="sm"
                  variant="ghost"
                >
                  <span className="fk-flex fk-flex-wrap fk-grow">
                    {field.value?.value?.[primaryAttributeName] || ''}
                  </span>
                  {field.value?.value?.[primaryAttributeName] ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="fk-h-8 fk-w-8 fk-rounded"
                            onClick={handleClearingSingle}
                            size="icon"
                            variant="ghost"
                          >
                            <ClearIcon className="fk-h-4 fk-w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                  <ChevronsUpDown className="fk-h-4 fk-w-4 fk-stroke-muted-foreground" />
                </Button> */}
                <div
                  className={`fk-relative fk-flex fk-w-full fk-items-start fk-space-x-2 fk-rounded-md fk-border fk-border-input fk-bg-background ${
                    hasFocus ? 'fk-outline-none fk-ring-2 fk-ring-ring fk-ring-offset-2' : ''
                  }`}
                >
                  <Input
                    className="fk-caret-transparent fk-border-0 focus-visible:fk-ring-0 focus-visible:fk-ring-offset-0"
                    onBlur={() => {
                      setHasFocus(false);
                    }}
                    onClick={handleSelection}
                    onFocus={() => {
                      setHasFocus(true);
                    }}
                    onMouseEnter={() => {
                      setIsHover(true);
                    }}
                    onMouseLeave={() => {
                      setIsHover(false);
                    }}
                    readOnly
                    type="text"
                    value={field.value?.value?.[primaryAttributeName] || ''}
                  />
                  {field.value?.value?.[primaryAttributeName] ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="fk-absolute fk-right-10 fk-top-1 fk-h-8 fk-w-8 fk-rounded"
                            onClick={handleClearingSingle}
                            onMouseEnter={() => {
                              setIsHover(true);
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <ClearIcon className="fk-h-4 fk-w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="fk-absolute fk-right-1 fk-top-1 fk-h-8 fk-w-8 fk-rounded"
                          onClick={handleSelection}
                          size="icon"
                          variant="ghost"
                        >
                          <ChevronsUpDown className="fk-h-4 fk-w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
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
  relationshipEntitySchema: Entity | undefined;
  scope: string;
};

function dataAdapter({ data, relationshipEntitySchema, scope }: DataAdapter): [] | undefined {
  return data?.map((row) =>
    map((field) => {
      if (typeof field === 'object' && field.__typename) {
        const relationshipFieldSchema = find(propEq(field.__typename, 'name'))(
          relationshipEntitySchema?.attributes ?? []
        ) as Attribute;
        const relationshipFieldName = relationshipFieldSchema?.relationship?.field ?? '';

        console.log({ field }, { relationshipFieldName });
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
