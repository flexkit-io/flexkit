'use client';

import { useCallback, useReducer, useState } from 'react';
import type { Dispatch } from 'react';
import { gql } from '@apollo/client';
import { useApolloClient } from '@apollo/client/react';
import { toast } from '../../ui';
import type { Attribute, Entity } from '../../core/types';
import {
  buildExpandQuery,
  buildRecordsQuery,
  EXPAND_PAGE,
  fetchedFromRecords,
  getEntity,
  graphFromRecords,
  nodeKey,
  type GraphRecord,
} from './graph';
import { EMPTY_SCENE, sceneReducer, type SceneAction, type SceneState } from './scene';

/** Which records to load: given ids (with their first hop when `expand`), or a sample. */
export type RecordSelection = { ids: string[]; expand: boolean } | { limit: number };

export interface SceneApi {
  state: SceneState;
  dispatch: Dispatch<SceneAction>;
  isLoading: boolean;
  /** Loads records, with the first page of each relationship when asked; resolves to their node keys. */
  loadRecords: (entity: Entity, selection: RecordSelection) => Promise<string[]>;
  /** Loads the first page of every relationship of a node. */
  expandAll: (key: string) => Promise<void>;
  /** Loads the next page of one relationship of a node. */
  expandAttribute: (key: string, attribute: Attribute) => Promise<void>;
}

type RecordsResult = { [plural: string]: GraphRecord[] };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The records could not be loaded.';
}

/**
 * The scene plus the loaders that grow it through the project GraphQL API,
 * so the roles and spaces of the signed-in member apply to every node.
 */
export function useScene({ schema, scope }: { schema: Entity[]; scope: string }): SceneApi {
  const client = useApolloClient();
  const [state, dispatch] = useReducer(sceneReducer, EMPTY_SCENE);
  const [pending, setPending] = useState(0);

  const loadRecords = useCallback(
    async (entity: Entity, selection: RecordSelection): Promise<string[]> => {
      const ids = 'ids' in selection ? selection.ids : undefined;
      const expand = 'ids' in selection ? selection.expand : false;
      const limit = 'limit' in selection ? selection.limit : ids?.length;
      setPending((count) => count + 1);

      try {
        const result = await client.query<RecordsResult>({
          query: gql(buildRecordsQuery({ entity, schema, scope, expand })),
          variables: {
            where: ids ? { _id: { in: ids } } : undefined,
            limit,
          },
          fetchPolicy: 'network-only',
        });
        const records = result.data?.[entity.plural] ?? [];
        dispatch({
          type: 'merge',
          data: graphFromRecords({ records, entity, schema, scope }),
          fetched: fetchedFromRecords(records, entity),
        });

        return records.map((record) => nodeKey(entity.name, record._id));
      } catch (error) {
        toast.error(errorMessage(error));

        return [];
      } finally {
        setPending((count) => count - 1);
      }
    },
    [client, schema, scope]
  );

  const expandAll = useCallback(
    async (key: string): Promise<void> => {
      const node = state.nodes[key];
      const entity = node ? getEntity(schema, node.entity) : undefined;

      if (!node || !entity) {
        return;
      }

      await loadRecords(entity, { ids: [node.id], expand: true });
    },
    [loadRecords, schema, state.nodes]
  );

  const expandAttribute = useCallback(
    async (key: string, attribute: Attribute): Promise<void> => {
      const node = state.nodes[key];
      const entity = node ? getEntity(schema, node.entity) : undefined;

      if (!node || !entity) {
        return;
      }

      const offset = state.fetched[key]?.[attribute.name] ?? 0;
      setPending((count) => count + 1);

      try {
        const result = await client.query<RecordsResult>({
          query: gql(buildExpandQuery({ entity, schema, scope, attribute })),
          variables: { id: node.id, offset, limit: EXPAND_PAGE },
          fetchPolicy: 'network-only',
        });
        const records = result.data?.[entity.plural] ?? [];
        const received = records.reduce((sum, record) => {
          const related = record[attribute.name];

          return sum + (Array.isArray(related) ? related.length : 0);
        }, 0);
        dispatch({
          type: 'merge',
          data: graphFromRecords({ records, entity, schema, scope }),
          fetched: { [key]: { [attribute.name]: offset + received } },
        });
      } catch (error) {
        toast.error(errorMessage(error));
      } finally {
        setPending((count) => count - 1);
      }
    },
    [client, schema, scope, state.fetched, state.nodes]
  );

  return { state, dispatch, isLoading: pending > 0, loadRecords, expandAll, expandAttribute };
}
