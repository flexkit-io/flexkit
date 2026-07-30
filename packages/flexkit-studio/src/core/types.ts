import type { JSX } from 'react';
import type { z } from 'zod';
import type {
  AttributeValue,
  EntityItem,
  MappedEntityItem,
  ImageValue,
  OrderedAssetValue,
} from '../graphql-client/types';

export type SingleRelationshipConnection = {
  _id: string;
  value:
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

export type MultipleRelationshipConnection = {
  _id: string;
  sortOrder?: number;
  value:
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
}[];

export type Relationships = {
  [relationshipId: string]:
    | {
        connect?: SingleRelationshipConnection | MultipleRelationshipConnection;
        disconnect?: string[];
      }
    | undefined;
};

export type AppContextType = {
  isRouteLoading: boolean;
  pageTitle: string;
  scope: string;
  relationships: Relationships;
};

export type ActionSetScope = {
  type: 'setScope';
  payload: {
    projectId?: string;
    scope: string;
  };
};

export type ActionSetRelationship = {
  type: 'setRelationship';
  payload: {
    [relationshipId: string]: {
      connect?: SingleRelationshipConnection | MultipleRelationshipConnection;
      disconnect: string[];
    };
  };
};

export type ScopeType = 'local' | 'global' | 'relationship';

export type DataType =
  | 'cartesianpoint'
  | 'bigint'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'duration'
  | 'float'
  | 'id'
  | 'int'
  | 'point'
  | 'string'
  | 'time'
  | 'asset';

export type DefaultValueByDataType = {
  asset: '';
  bigint: string;
  boolean: boolean | '';
  cartesianpoint: string;
  date: string;
  datetime: string;
  duration: string;
  float: number | '';
  id: string;
  int: number | '';
  point: string;
  string: string;
  time: string;
};

export type DefaultValue<T extends DataType = DataType> = DefaultValueByDataType[T];

export type InputType =
  | 'datetime'
  | 'editor'
  | 'asset'
  | 'number'
  | 'relationship'
  | 'select'
  | 'switch'
  | 'text'
  | 'textarea'
  | (string & NonNullable<unknown>);

export type PreviewType =
  | 'boolean'
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'editor'
  | 'select'
  | 'relationship'
  | 'swtich'
  | 'textarea'
  | (string & NonNullable<unknown>);

type SelectList = {
  label: string;
  value: string;
};

type GroupedSelectList = {
  groupLabel: string;
  items: SelectList[];
};

type ZodNamespace = typeof z;

export type CommonOptions = {
  comment?: string;
  size?: number;
  placeholder?: string;
};

export type SelectOptions = CommonOptions & {
  list: SelectList[] | GroupedSelectList[];
};

export type AssetOptions = CommonOptions & {
  accept?: string;
};

export type RelationshipOptions = CommonOptions & {
  accept?: string;
};

export type DateTimeOptions = CommonOptions & {
  format?: string;
};

export type NumberOptions = CommonOptions & {
  min?: number;
  max?: number;
};

export type AttributeOptions = {
  select: SelectOptions;
  asset: AssetOptions;
  datetime: DateTimeOptions;
  number: NumberOptions;
  relationship: RelationshipOptions;
  text: CommonOptions;
  textarea: CommonOptions;
  switch: CommonOptions;
  [key: string]: CommonOptions;
};

type AttributeBase = {
  inputType: InputType;
  previewType?: PreviewType;
  isEditable?: boolean;
  isHidden?: boolean;
  isPrimary?: boolean;
  isUnique?: boolean;
  isSearchable?: boolean;
  label: string;
  name: string;
  options?: AttributeOptions[InputType];
  relationship?: {
    entity: string;
    mode: 'single' | 'multiple';
    field: string;
  };
  validation?: (zod: ZodNamespace) => z.ZodType;
};

type AttributeByDataType<T extends DataType> = AttributeBase & {
  dataType: T;
  defaultValue?: DefaultValueByDataType[T];
} & (T extends 'asset' ? { scope?: 'global' } : { scope: ScopeType });

export type Attribute = {
  [T in DataType]: AttributeByDataType<T>;
}[DataType];

export type Entity = {
  name: string;
  plural: string;
  menu?:
    | { hidden: true; label?: string }
    | {
        label?: string;
        group?: string;
        icon?: JSX.Element;
      };
  attributes: Attribute[];
};

export type Schema = Entity[];

type Scope = {
  name: string;
  label: string;
  isDefault?: boolean;
  sortOrder?: number;
};

export type Scopes = Scope[];

export type FormFieldSchema = Attribute;

export type GridEntityRow = {
  [attributeName: string]: string;
};

export type RawResultItem = {
  collection: string;
  found: number;
  hits: {
    document: {
      id: string;
      [key: string]: string | { [key: string]: string };
    };
    score: number;
  }[];
};

type RawResultError = {
  code: number;
  error: string;
};

export type RawSearchResultItems = (RawResultItem | RawResultError)[];

export interface SearchResultItem {
  _id: string;
  _entityName: string;
  _entityNamePlural: string;
  [key: string]: string;
}

export interface SearchRequestProps {
  searchRequests: {
    searches: {
      collection: string;
    }[];
  };
  commonParams: {
    q: string;
  };
}
