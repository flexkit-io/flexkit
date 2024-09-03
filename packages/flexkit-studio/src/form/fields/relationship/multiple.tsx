import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Dispatch, RefObject, SyntheticEvent } from 'react';
// @ts-expect-error -- this is an ECMAScript module
import { useLazyQuery, gql } from '@apollo/client';
import type { Row } from '@tanstack/react-table';
import { find, map, prop, propEq, uniq, uniqBy } from 'ramda';
import { Link, Maximize2, X as ClearIcon } from 'lucide-react';
import { getRelatedItemsQuery, mapQueryResult } from '../../../graphql-client/queries';
import type {
  AttributeValue,
  EntityQueryAggregate,
  EntityItem,
  EntityQueryResults,
  MappedEntityItem,
} from '../../../graphql-client/types';
import { gridColumnsDefinition } from '../../../data-grid/columns';
import { DataTable } from '../../../data-grid/data-table';
import { Button } from '../../../ui/primitives/button';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../../ui/primitives/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/primitives/tooltip';
import { Badge } from '../../../ui/primitives/badge';
import { Collapsible, CollapsibleContent } from '../../../ui/primitives/collapsible';
import type {
  ActionSetRelationship,
  Attribute,
  Entity,
  MultipleRelationshipConnection,
  Relationships,
} from '../../../core/types';
import { useDispatch } from '../../../entities/actions-context';
import { useAppContext, useAppDispatch } from '../../../core/app-context';
import type { FormFieldParams } from '../../types';
import { DataTableRowActions } from './data-table-row-actions';

const PAGE_SIZE = 25;

export default function MultipleRelationship({
  control,
  defaultScope,
  defaultValue,
  entityId,
  entityName,
  entityNamePlural,
  fieldSchema,
  schema,
  scope,
  setValue,
}: FormFieldParams): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOuterClick(wrapperRef, setIsOpen);
  const [rows, setRows] = useState<AttributeValue[] | []>([]);
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
      defaultValue.value
        ? dataAdapter({ data: defaultValue.value, defaultScope, primaryAttributeName, relationshipEntitySchema, scope })
        : [],
    [defaultScope, defaultValue, primaryAttributeName, relationshipEntitySchema, scope]
  );
  const entityQuery = getRelatedItemsQuery({
    attributeName: name,
    relatedEntityName: relationshipEntityName,
    scope,
    schema,
  });
  const previewItems = rows.length ? rows.slice(0, 12).map((row) => row[primaryAttributeName] as string) : [];
  const [getData, { loading, data }] = useLazyQuery<EntityQueryResults & EntityQueryAggregate>(gql`
    ${entityQuery.query}
  `);

  const columns = useMemo(
    () =>
      gridColumnsDefinition<AttributeValue, unknown>({
        attributesSchema: relationshipEntitySchema?.attributes ?? [],
        actionsComponent: (row) => dataRowActions({ appDispatch, relationshipId, relationships, row, setRows }),
      }),
    [appDispatch, relationshipEntitySchema?.attributes, relationshipId, relationships]
  );

  useEffect(() => {
    setRows(initialRows);

    if (defaultValue.value === '') {
      return;
    }

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

  /**
   * Update the value of the field when the relationshp context value changes
   * The relationshp context value changes when the user selects a row from the datagrid in the EditRelationship modal
   * or when the user ticks one of the pre-existing relationships for deletion
   */
  useEffect(() => {
    setValue(name, { ...defaultValue, relationships: relationships[relationshipId] });
  }, [defaultValue, relationships, relationshipId, setValue, name]);

  /**
   * Set the value of the rows for the datagrid
   */
  useEffect(() => {
    const connections = (relationships[relationshipId]?.connect as MultipleRelationshipConnection | null) ?? [];
    const selectedRows = connections.map(({ value }) => value);

    setRows(uniqBy(prop('_id'), [...(selectedRows as []), ...initialRows]));
  }, [data, defaultValue.count, initialRows, relationships, relationshipId]);

  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      const totalCount = defaultValue.count ?? 0;

      if (!containerRefElement || totalCount === 0 || rows.length === 0) {
        return;
      }

      const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
      //once the user has scrolled within 200px of the bottom of the table, fetch more data if we can
      if (scrollHeight - scrollTop - clientHeight < 200 && !loading && rows.length < totalCount) {
        getData({
          variables: {
            options: {
              limit: PAGE_SIZE,
              offset: rows.length,
            },
            where: {
              productsConnection_SOME: {
                node: {
                  _id: entityId,
                },
              },
            },
          },
        })
          .then(({ data: res }) => {
            if (!res) {
              return;
            }

            const mappedData = mapQueryResult(relationshipEntitySchema?.plural ?? '', scope, res, schema);
            setRows(uniqBy(prop('_id'), [...initialRows, ...(mappedData.results as [])]));
          })
          .catch((error: unknown) => {
            // eslint-disable-next-line no-console -- show the error to the user
            console.error('Error fetching more data:', error);
          });
      }
    },
    [
      defaultValue.count,
      entityId,
      getData,
      initialRows,
      loading,
      relationshipEntitySchema?.plural,
      rows.length,
      schema,
      scope,
    ]
  );

  function handleSelection(event: SyntheticEvent): void {
    event.preventDefault();
    actionDispatch({
      type: 'EditRelationship',
      payload: {
        connectedEntitiesCount: initialRows.length,
        connectionName,
        entityName: relationshipEntityName,
        entityId,
        relationshipId,
        mode: relationship?.mode ?? 'multiple',
      },
    });
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
                      classNames={{ table: 'fk-max-h-[17.5rem]' }}
                      columns={columns}
                      data={rows}
                      entityName={entityName}
                      onScroll={(e) => {
                        fetchMoreOnBottomReached(e.target as HTMLDivElement);
                      }}
                      rowAdditionState={
                        relationships[relationshipId]?.connect as MultipleRelationshipConnection | undefined
                      }
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

type DataRowActions = {
  appDispatch: Dispatch<ActionSetRelationship>;
  relationshipId: string;
  relationships: Relationships;
  row: Row<AttributeValue>;
  setRows: Dispatch<React.SetStateAction<AttributeValue[]>>;
};

function dataRowActions({ appDispatch, relationshipId, relationships, row, setRows }: DataRowActions): JSX.Element {
  function disconnectEntity(entityId: string): void {
    const connectedEntities = (relationships[relationshipId]?.connect as MultipleRelationshipConnection | null) ?? [];
    const rowToDeleteWasJustConnected = typeof find(propEq(entityId, '_id'), connectedEntities) === 'object';

    const shouldUndoDisconnection = relationships[relationshipId]?.disconnect?.includes(entityId);
    const disconnection = rowToDeleteWasJustConnected
      ? (relationships[relationshipId]?.disconnect ?? [])
      : uniq([...(relationships[relationshipId]?.disconnect ?? []), entityId]);

    if (rowToDeleteWasJustConnected) {
      setRows((rows) => rows.filter((rowItem) => rowItem._id !== entityId));
    }

    appDispatch({
      type: 'setRelationship',
      payload: {
        [relationshipId]: {
          connect: connectedEntities.filter((rowItem) => rowItem._id !== entityId),
          disconnect: shouldUndoDisconnection
            ? (relationships[relationshipId]?.disconnect?.filter((_id) => _id !== entityId) ?? [])
            : disconnection,
        },
      },
    });
  }

  return <DataTableRowActions action={disconnectEntity} row={row} />;
}

/**
 * Find the name of the attribute of an entity with isPrimary === true.
 * The value of that attribute is returned as the value for the relationship attribute
 */
function getPrimaryAttributeName(schemaAttributes: Attribute[]): string {
  return schemaAttributes.find((attr) => attr.isPrimary)?.name ?? schemaAttributes[0]?.name;
}

type DataAdapter = {
  data: string | MappedEntityItem | EntityItem | AttributeValue;
  defaultScope: string;
  primaryAttributeName: string;
  relationshipEntitySchema: Entity | undefined;
  scope: string;
};

function dataAdapter({
  data,
  defaultScope,
  primaryAttributeName,
  relationshipEntitySchema,
  scope,
}: DataAdapter): AttributeValue[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(
    (row: MappedEntityItem | EntityItem) =>
      map((field) => {
        if (typeof field === 'object' && field.__typename) {
          const relationshipFieldSchema = find(propEq(field.__typename, 'name'))(
            relationshipEntitySchema?.attributes ?? []
          ) as Attribute | undefined;
          const relationshipFieldName = relationshipFieldSchema?.relationship?.field ?? '';

          if (relationshipFieldName) {
            return field[relationshipFieldName];
          }

          return field[scope] ?? field[defaultScope];
        }

        if (Array.isArray(field)) {
          const test = field as AttributeValue[];
          return test
            .slice(0, 3)
            .map(
              (item) =>
                (item[primaryAttributeName] as AttributeValue | undefined)?.[scope] ??
                (item[primaryAttributeName] as AttributeValue | undefined)?.[defaultScope]
            )
            .join(', ');
        }

        return field;
      }, row) as AttributeValue
  );
}

// function getRowClassName(_id: string, relationshipId: string, relationships: Relationships): string {
//   const isAdding = find(propEq('_id', _id))(relationships[relationshipId]?.connect || []);
//   const isRemoving = relationships[relationshipId]?.disconnect?.includes(_id);

//   if (isAdding) {
//     return 'add-relationship';
//   }

//   if (isRemoving) {
//     return 'remove-relationship';
//   }

//   return '';
// }

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
