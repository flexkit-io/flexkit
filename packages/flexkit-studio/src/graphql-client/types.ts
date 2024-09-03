// @ts-expect-error -- this is an ECMAScript module
import type { OperationVariables } from '@apollo/client';
import type { SingleRelationshipConnection, MultipleRelationshipConnection, Schema } from '../core/types';

export type AttributeValue = {
  _id: string;
  [key: string]: string | AttributeValue | null;
  __typename: string;
};

export type EntityQueryAggregate = {
  __typename: string;
  count: number;
};

export type EntityQueryResult = {
  __typename: string;
  _id: string;
  [key: string]: string | AttributeValue;
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
  [attributeName: string]: string;
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
  [attributeName: string]: FormAttributeValue;
};

export type UseEntityQueryParams = {
  entityNamePlural: string;
  schema: Schema;
  scope: string;
  variables?: OperationVariables;
  isForm?: boolean;
};

export type FormAttributeValue = {
  _id?: string;
  count?: number;
  disabled: boolean;
  relationships?: {
    connect?: SingleRelationshipConnection | MultipleRelationshipConnection;
    disconnect?: string[];
  };
  scope: string;
  value: string | MappedEntityItem | EntityItem | AttributeValue | undefined | null;
};
