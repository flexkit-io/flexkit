'use client';

import { useMemo } from 'react';
import type { JSX } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { formatDistance } from 'date-fns';
import { EyeOffIcon, ExpandIcon, LoaderCircleIcon, SquareArrowOutUpRightIcon, XIcon } from 'lucide-react';
import type { Attribute, Entity } from '../../core/types';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '../../ui';
import {
  buildCountsQuery,
  buildDetailsQuery,
  formatDetailValue,
  getDetailAttributes,
  getEntity,
  getEntityLabel,
  getRelationshipAttributes,
  type GraphNode,
  type GraphRecord,
} from './graph';
import { countEdgesByAttribute, type SceneState } from './scene';

export interface GraphInspectorProps {
  node: GraphNode;
  schema: Entity[];
  scope: string;
  scene: SceneState;
  colors: { [entity: string]: string };
  isLoading: boolean;
  onClose: () => void;
  onOpenRecord: (key: string) => void;
  onExpandAll: (key: string) => void;
  onExpandAttribute: (key: string, attribute: Attribute) => void;
  onHide: (key: string) => void;
}

type ConnectionCount = { aggregate?: { count?: { nodes?: number } } };
type DetailsResult = { [plural: string]: (GraphRecord & { _updatedAt?: string })[] };

/**
 * The selected node: its scalar attributes in the current scope and each
 * relationship with how many related records are on the canvas out of the
 * total, with a button to fetch the next page.
 */
export function GraphInspector({
  node,
  schema,
  scope,
  scene,
  colors,
  isLoading,
  onClose,
  onOpenRecord,
  onExpandAll,
  onExpandAttribute,
  onHide,
}: GraphInspectorProps): JSX.Element {
  const entity = getEntity(schema, node.entity);
  const detailsDocument = useMemo(
    () => gql(entity ? buildDetailsQuery({ entity, scope }) : 'query GraphDetails { __typename }'),
    [entity, scope]
  );
  const countsDocument = useMemo(
    () => gql(entity ? buildCountsQuery({ entity }) : 'query GraphCounts { __typename }'),
    [entity]
  );
  const details = useQuery<DetailsResult>(detailsDocument, { variables: { id: node.id }, skip: !entity });
  const counts = useQuery<{ [plural: string]: { [field: string]: ConnectionCount }[] }>(countsDocument, {
    variables: { id: node.id },
    skip: !entity,
  });
  const record = entity ? details.data?.[entity.plural]?.[0] : undefined;
  const countRecord = entity ? counts.data?.[entity.plural]?.[0] : undefined;
  const onCanvas = useMemo(() => countEdgesByAttribute(scene, node.key), [scene, node.key]);
  const relationships = entity ? getRelationshipAttributes(entity) : [];
  const attributes = entity ? getDetailAttributes(entity) : [];
  const updatedAt = record?._updatedAt ? new Date(record._updatedAt) : null;

  return (
    <aside
      aria-label="Selected record"
      className="fk:flex fk:w-72 fk:shrink-0 fk:flex-col fk:gap-5 fk:overflow-y-auto fk:border-l fk:bg-background fk:p-4 fk:text-sm"
      data-testid="graph-inspector"
    >
      <div className="fk:flex fk:flex-col fk:gap-2">
        <div className="fk:flex fk:items-center fk:justify-between fk:gap-2">
          <span className="fk:inline-flex fk:items-center fk:gap-1.5 fk:rounded-full fk:bg-muted fk:px-2 fk:py-0.5 fk:text-xs fk:font-medium">
            <span
              aria-hidden="true"
              className="fk:size-2 fk:rounded-full"
              style={{ backgroundColor: colors[node.entity] ?? '#71717a' }}
            />
            {entity ? getEntityLabel(entity) : node.entity}
          </span>
          <Button aria-label="Close" className="fk:size-7" onClick={onClose} size="icon" variant="ghost">
            <XIcon className="fk:size-4" />
          </Button>
        </div>
        <h2 className="fk:text-base fk:font-semibold fk:leading-snug fk:break-words">{node.label}</h2>
        <div className="fk:flex fk:flex-wrap fk:gap-2">
          <Button className="fk:h-8" onClick={() => onOpenRecord(node.key)} size="sm">
            <SquareArrowOutUpRightIcon className="fk:size-3.5" />
            Open record
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Expand every relationship"
                className="fk:h-8"
                disabled={isLoading}
                onClick={() => onExpandAll(node.key)}
                size="sm"
                variant="outline"
              >
                {isLoading ? <LoaderCircleIcon className="fk:size-3.5 fk:animate-spin" /> : <ExpandIcon className="fk:size-3.5" />}
                Expand
              </Button>
            </TooltipTrigger>
            <TooltipContent>Load the first related records of every relationship</TooltipContent>
          </Tooltip>
          <Button aria-label="Hide this node" className="fk:h-8" onClick={() => onHide(node.key)} size="sm" variant="outline">
            <EyeOffIcon className="fk:size-3.5" />
            Hide
          </Button>
        </div>
      </div>

      <section className="fk:flex fk:flex-col fk:gap-2">
        <h3 className="fk:text-xs fk:font-medium fk:text-muted-foreground">Attributes</h3>
        {details.loading && !record ? (
          <span className="fk:text-muted-foreground">Loading…</span>
        ) : (
          <dl className="fk:grid fk:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] fk:gap-x-3 fk:gap-y-1.5">
            {attributes.map((attribute) => (
              <div className="fk:contents" key={attribute.name}>
                <dt className="fk:truncate fk:text-muted-foreground" title={attribute.label}>
                  {attribute.label}
                </dt>
                <dd className="fk:min-w-0 fk:break-words">{record ? formatDetailValue(record[attribute.name], scope) || '—' : '—'}</dd>
              </div>
            ))}
            {updatedAt ? (
              <div className="fk:contents">
                <dt className="fk:text-muted-foreground">Updated</dt>
                <dd>{formatDistance(updatedAt, new Date(), { addSuffix: true })}</dd>
              </div>
            ) : null}
          </dl>
        )}
      </section>

      {relationships.length > 0 ? (
        <section className="fk:flex fk:flex-col fk:gap-1">
          <h3 className="fk:mb-1 fk:text-xs fk:font-medium fk:text-muted-foreground">Relationships</h3>
          {relationships.map((attribute) => {
            const relatedEntity = getEntity(schema, attribute.relationship?.entity ?? '');
            const total = countRecord?.[`${attribute.name}Connection`]?.aggregate?.count?.nodes;
            const shown = onCanvas[attribute.name] ?? 0;
            const fetched = scene.fetched[node.key]?.[attribute.name] ?? 0;
            const exhausted = typeof total === 'number' && fetched >= total;

            return (
              <div className="fk:flex fk:h-8 fk:items-center fk:gap-2" key={attribute.name}>
                <span
                  aria-hidden="true"
                  className="fk:size-2 fk:shrink-0 fk:rounded-full"
                  style={{ backgroundColor: colors[attribute.relationship?.entity ?? ''] ?? '#71717a' }}
                />
                <span className="fk:min-w-0 fk:flex-1 fk:truncate" title={relatedEntity ? getEntityLabel(relatedEntity) : undefined}>
                  {attribute.label}
                </span>
                <span className="fk:text-xs fk:text-muted-foreground">
                  {typeof total === 'number' ? `${shown} of ${total.toLocaleString()}` : shown}
                </span>
                {total === 0 || exhausted ? null : (
                  <Button
                    className="fk:h-6 fk:px-2 fk:text-xs"
                    disabled={isLoading}
                    onClick={() => onExpandAttribute(node.key, attribute)}
                    size="xs"
                    variant="outline"
                  >
                    {fetched > 0 ? 'More' : 'Expand'}
                  </Button>
                )}
              </div>
            );
          })}
        </section>
      ) : null}
    </aside>
  );
}
