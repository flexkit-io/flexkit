import type { OperationVariables } from '@apollo/client';
import type { SingleRelationshipConnection, MultipleRelationshipConnection, Schema } from '../core/types';

export type AttributeValue = {
  _id: string;
  [key: string]: string | AttributeValue | AttributeValue[] | null;
  __typename: string;
};

/**
 * Shape of xConnection fields queried for counts in Neo4j GraphQL v7:
 * xConnection \{ aggregate \{ count \{ nodes \} \} \}.
 */
export type EntityQueryAggregate = {
  __typename: string;
  aggregate: {
    count: {
      nodes: number;
    };
  };
};

export type EntityQueryResult = {
  __typename: string;
  _id: string;
  [key: string]: string | AttributeValue | AttributeValue[] | unknown;
};

export type EntityQueryResults = {
  [key: string]: EntityQueryAggregate | EntityQueryResult[];
};

export type EntityItem = {
  [attribute: string]: AttributeValue;
};

export type EntityList = {
  [entity: string]: {
    count: number;
    results: EntityItem[];
  } | null;
};

export type EntityData = {
  [attributeName: string]: EntityItem;
};

export type MappedEntityItem = {
  _id: string;
  [attributeName: string]: string | OrderedAssetValue[];
};

export type ImageValue = {
  _id: string;
  path: string;
  size: number;
  mimeType: string;
  originalFilename: string;
  lqip: string;
  width: number;
  height: number;
};

export type OrderedAssetValue = ImageValue & {
  sortOrder?: number;
};

export type MappedEntityQueryResults = {
  count: number;
  results: MappedEntityItem[] | [];
};

export type MappedFormEntityQueryResults = {
  count: number;
  results: FormEntityItem[] | [];
};

export type FormEntityItem = {
  [attributeName: string]: FormFieldValue;
};

export type EntityQuerySelection = 'list' | 'full';

export type UseEntityQueryParams = {
  entityNamePlural: string;
  schema: Schema;
  scope: string;
  variables?: OperationVariables;
  isForm?: boolean;
  /**
   * `list` only selects each related entity's primary attribute (desk/list grids).
   * `full` keeps nested relationship fields (forms, relationship pickers). Default: `full`.
   */
  selection?: EntityQuerySelection;
};

export type FormFieldValue = {
  _id?: string;
  count?: number;
  disabled: boolean;
  relationships?: {
    connect?: SingleRelationshipConnection | MultipleRelationshipConnection;
    disconnect?: string[];
  };
  scope: string;
  value:
    | boolean
    | number
    | string
    | MappedEntityItem
    | MappedEntityItem[]
    | EntityItem
    | EntityItem[]
    | AttributeValue
    | AttributeValue[]
    | ImageValue
    | OrderedAssetValue[]
    | undefined
    | null;
};
