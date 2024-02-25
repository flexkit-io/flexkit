import type { OperationVariables } from '@apollo/client';
import type { Schema } from '../core/types';

export type ScopedAttributeValue = {
  _id: string;
  default: string;
  [key: string]: string;
  __typename: string;
};

export type EntityItem = {
  [attribute: string]: ScopedAttributeValue;
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

export type MappedEntityQueryResults = {
  count: number;
  results: EntityItem[] | [];
};

export type MappedFormEntityQueryResults = {
  count: number;
  results: FormEntityItem[] | [];
};

export type FormEntityItem = {
  [attributeName: string]: FormScopedAttributeValue;
};

export type EntityQueryResults = [boolean, MappedEntityQueryResults];
export type FormEntityQueryResults = [boolean, MappedFormEntityQueryResults];

export type UseEntityQueryParams = {
  entityNamePlural: string;
  schema: Schema;
  scope: string;
  variables?: OperationVariables;
  isForm?: boolean;
};

type RelationshipConnections = {
  connect?: string[];
  disconnect?: string[];
};

export type FormRelationshipAttributeValue = {
  _id: string;
  value: [] | RelationshipConnections;
};

export type FormScopedAttributeValue = {
  _id: string;
  value: string | number | boolean | [];
  disabled: boolean;
  scope: string;
};
