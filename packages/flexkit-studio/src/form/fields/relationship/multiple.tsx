import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Dispatch, JSX, RefObject, SyntheticEvent } from 'react';
import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
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
import { useGridColumnsDefinition } from '../../../data-grid/columns';
import { DataTable } from '../../../data-grid/data-table';
import { Button } from '../../../ui/primitives/button';
import { FormControl, FormDescription, FormField, FormLabel, FormMessage, FormItem } from '../../../ui/primitives/form';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/primitives/tooltip';
import { Badge } from '../../../ui/primitives/badge';
import { Collapsible, CollapsibleContent } from '../../../ui/primitives/collapsible';
import { useOuterClick } from '../../../ui/hooks/use-outer-click';
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
}: FormFieldParams<'relationship'>): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useOuterClick(wrapperRef as RefObject<HTMLDivElement>, setIsOpen);
  const [rows, setRows] = useState<AttributeValue[] | []>([]);
  const { name, label, options, relationship } = fieldSchema;
  const relationshipEntityName: string = relationship?.entity ?? name;
  const actionDispatch = useDispatch();
  const appDispatch = useAppDispatch();
  const { relationships } = useAppContext();
  const fieldId = useId();
  const relationshipId = useId();
  const relationshipEntitySchema = find(propEq(relationshipEntityName, 'name'))(schema) as Entity | undefined;
  const relationshipEntityAttributesSchema = relationshipEntitySchema?.attributes ?? [];
  const baseEntitySchema = find(propEq(entityName, 'name'))(schema) as Entity | undefined;
  const baseEntityName = baseEntitySchema?.name ?? '';
  let connectionName: string | undefined;

  /**
   * Find out if this attribute is related to the base entity (by-directional relationship)
   * If so, get the relationship field name on the target entity that points back to the
   * base entity, so EditRelationship can filter out already-connected items with a
   * `none` quantifier filter (i.e. products: { none: { _id: { eq: ... } } }).
   * */
  const relationshipAttribute = relationshipEntityAttributesSchema.find(
    (attr) => attr.relationship?.entity === baseEntityName
  );

  if (relationshipAttribute) {
    connectionName = relationshipAttribute.name;
  }

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
  const previewLimit = 12;
  const previewItems = rows.length ? rows.slice(0, previewLimit).map((row) => row[primaryAttributeName] as string) : [];
  const hasMorePreviewItems = Math.max(rows.length, defaultValue.count ?? 0) > previewItems.length;
  const [getData, { loading, data }] = useLazyQuery<EntityQueryResults & EntityQueryAggregate>(gql`
    ${entityQuery.query}
  `);

  const columns = useGridColumnsDefinition<AttributeValue, unknown>({
    attributesSchema: relationshipEntitySchema?.attributes ?? [],
    actionsComponent: (row) => dataRowActions({ appDispatch, relationshipId, relationships, row, setRows }),
  });

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

  const totalCount = defaultValue.count ?? 0;
  const hasMore = totalCount > 0 && rows.length > 0 && rows.length < totalCount;

  const handleLoadMore = useCallback(() => {
    if (loading) {
      return;
    }

    getData({
      variables: {
        limit: PAGE_SIZE,
        offset: rows.length,
        where: connectionName
          ? {
              [connectionName]: {
                some: {
                  _id: { eq: entityId },
                },
              },
            }
          : {},
      },
    })
      .then(({ data: res }: { data: (EntityQueryResults & EntityQueryAggregate) | undefined }) => {
        if (!res) {
          return;
        }

        const mappedData = mapQueryResult(relationshipEntitySchema?.plural ?? '', scope, res, schema);
        setRows(uniqBy(prop('_id'), [...initialRows, ...(mappedData.results as [])]));
      })
      .catch((error: unknown) => {
        console.error('Error fetching more data:', error);
      });
  }, [
    connectionName,
    entityId,
    getData,
    initialRows,
    loading,
    relationshipEntitySchema?.plural,
    rows.length,
    schema,
    scope,
  ]);

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
        <FormItem className="fk:min-w-0">
          <FormLabel htmlFor={fieldId}>{label}</FormLabel>
          {options?.comment ? <FormDescription>{options.comment}</FormDescription> : null}
          <FormControl className="fk:flex fk:flex-col fk:w-full fk:min-w-0 fk:min-h-9.5 fk:pl-3 fk:pr-3 fk:py-0.5 fk:text-sm">
            <div
              aria-controls={`relationship-dropdown-${name}`}
              aria-expanded={isOpen}
              className={`fk:relative fk:flex fk:w-full fk:min-w-0 fk:items-start fk:space-x-2 fk:rounded-md fk:border fk:border-input fk:bg-background fk:focus-visible:outline-hidden fk:ring-offset-background fk:focus-visible:ring-2 fk:focus-visible:ring-ring fk:focus-visible:ring-offset-2 ${
                isOpen ? 'fk:outline-hidden fk:ring-2 fk:ring-ring fk:ring-offset-2' : ''
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

                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  wrapperRef.current?.blur();
                  setIsOpen(false);
                }
              }}
              ref={wrapperRef}
              role="combobox"
              tabIndex={0}
            >
              <div className="fk:flex fk:w-full fk:min-w-0 fk:flex-col">
                <div className="fk:flex fk:w-full fk:space-x-2">
                  {!isOpen ? (
                    <span className="fk:flex fk:min-w-0 fk:flex-wrap fk:grow fk:overflow-hidden fk:pb-1.5 fk:pr-10">
                      {previewItems.map((item) => (
                        <Badge
                          className="fk:mr-2 fk:mt-1.5 fk:max-w-60 fk:justify-start fk:rounded-xs"
                          key={item}
                          title={item}
                          variant="secondary"
                        >
                          <span className="fk:min-w-0 fk:truncate">{item}</span>
                        </Badge>
                      ))}
                      {hasMorePreviewItems ? (
                        <Badge className="fk:mr-2 fk:mt-1.5 fk:rounded-xs" variant="secondary">
                          …
                        </Badge>
                      ) : null}
                    </span>
                  ) : (
                    <Button className="fk:h-8 fk:mr-auto fk:mt-2" onClick={handleSelection} variant="outline">
                      <Link className="fk:h-4 fk:w-4 fk:mr-2" /> Link to a record from{' '}
                      {relationshipEntitySchema?.menu?.label ?? relationshipEntitySchema?.plural}
                    </Button>
                  )}
                  {!isOpen ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            className="fk:absolute fk:right-[0.1875rem] fk:top-[0.1875rem] fk:h-8 fk:w-8 fk:rounded-sm fk:text-muted-foreground"
                            id={fieldId}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                wrapperRef.current?.focus();
                                wrapperRef.current?.click();
                              }
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Maximize2 className="fk:h-4 fk:w-4" />
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
                            className="fk:absolute fk:right-[0.1875rem] fk:top-[0.1875rem] fk:h-8 fk:w-8 fk:rounded-sm fk:text-muted-foreground"
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
                            <ClearIcon className="fk:h-4 fk:w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Close</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <Collapsible
                  className="fk:w-full fk:min-w-0 fk:space-y-2 fk:ml-0!"
                  onOpenChange={setIsOpen}
                  open={isOpen}
                >
                  <CollapsibleContent className="fk:w-full fk:min-w-0">
                    <div className="fk:mt-3 fk:mb-2 fk:w-full fk:min-w-0" id={`relationship-dropdown-${name}`}>
                      <DataTable
                        classNames={{
                          wrapper: 'fk:h-[17.5rem] fk:min-h-0 fk:min-w-0 fk:gap-0',
                          table: 'fk:pb-0',
                        }}
                        columns={columns}
                        data={rows}
                        entityName={entityName}
                        hasMore={hasMore}
                        isLoadingMore={loading && rows.length > 0}
                        onLoadMore={handleLoadMore}
                        rowAdditionState={
                          relationships[relationshipId]?.connect as MultipleRelationshipConnection | undefined
                        }
                        rowDeletionState={relationships[relationshipId]?.disconnect}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
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
  data: unknown;
  defaultScope: string;
  primaryAttributeName: string;
  relationshipEntitySchema: Entity | undefined;
  scope: string;
};

function dataAdapter({ data, defaultScope, relationshipEntitySchema, scope }: DataAdapter): AttributeValue[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const renderNode = (node: AttributeValue): unknown => {
    const relationshipFieldSchema = find(propEq(node.__typename, 'name'))(
      relationshipEntitySchema?.attributes ?? []
    ) as Attribute | undefined;
    const relationshipFieldName = relationshipFieldSchema?.relationship?.field ?? '';

    if (relationshipFieldName) {
      const rawFieldValue = node[relationshipFieldName];
      const fieldNode = (Array.isArray(rawFieldValue) ? rawFieldValue[0] : rawFieldValue) as
        | AttributeValue
        | string
        | null
        | undefined;

      if (fieldNode && typeof fieldNode === 'object') {
        return fieldNode[scope] ?? fieldNode[defaultScope] ?? '';
      }

      return fieldNode;
    }

    return node[scope] ?? node[defaultScope];
  };

  return data.map(
    (row: MappedEntityItem | EntityItem) =>
      map((field) => {
        // All relationship fields (scoped attributes, single and multiple
        // relationships) are lists in the schema
        if (Array.isArray(field)) {
          const nodes = field as unknown as AttributeValue[];

          if (nodes.length === 0) {
            return '';
          }

          if (nodes.length === 1) {
            return renderNode(nodes[0]);
          }

          return nodes.slice(0, 3).map(renderNode).join(', ');
        }

        if (field && typeof field !== 'string' && field.__typename) {
          return renderNode(field);
        }

        return field;
      }, row) as AttributeValue
  );
}
