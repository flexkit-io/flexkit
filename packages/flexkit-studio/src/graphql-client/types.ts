// @ts-expect-error -- ignore bug in @apollo/client causing TS to complain about the import not being an ES module
import type { OperationVariables } from '@apollo/client';
import type { SingleRelationshipConnection, MultipleRelationshipConnection, Schema } from '../core/types';

export type AttributeValue = {
  _id: string;
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
//     [attributeName: string]: string | AttributeValue;
//   }[];
// };

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

export type EntityQueryResults = [boolean, MappedEntityQueryResults];
export type FormEntityQueryResults = [boolean, MappedFormEntityQueryResults];

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
  value: string | MappedEntityItem | FormEntityItem | undefined;
};
