// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import type { OperationVariables } from '@apollo/client';
import type { Schema } from '../core/types';

export type ScopedAttributeValue = {
  _id: string;
  default: string;
  [key: string]: string;
  __typename: string;
};

export type EntityQueryAggregate = {
  [aggregateKey: string]: {
    count: number;
    __typename: string;
  };
};

// export type EntityQueryResults = {
//   [entityName: string]: {
//     _id: string;
//     __typename: string;
//     [attributeName: string]: string | ScopedAttributeValue;
//   }[];
// };

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

export type FormAttributeValue = {
  _id?: string;
  count?: number;
  value:
    | string
    | { [key: string]: string | number | boolean | readonly string[] | undefined }
    | { [key: string]: string | number | boolean | readonly string[] | { [key: string]: string | number | boolean } }[];
  disabled: boolean;
  scope: string;
};
