import type { UiAttribute } from '@flexkit/schema';
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

/**
 * Schema types come from `@flexkit/schema`. Inside the Studio, `Entity` and
 * `Attribute` are the deployed (UI) shapes: validation is JSON Schema, icons
 * are lucide names, and `hidden` / `readOnly` are booleans.
 */
export type {
  AssetOptions,
  AttributeOptions,
  CommonOptions,
  DataType,
  DateTimeOptions,
  DefaultValue,
  DefaultValueByDataType,
  EntityMenu,
  FieldGroup,
  GroupedSelectList,
  InputType,
  JsonSchemaObject,
  MenuGroup,
  NumberOptions,
  PreviewType,
  RelationshipOptions,
  Scope,
  ScopeType,
  Scopes,
  SelectList,
  SelectOptions,
  Space,
  Spaces,
} from '@flexkit/schema';
export type { UiAttribute as Attribute, UiEntity as Entity, UiSchema as Schema } from '@flexkit/schema';

export type FormFieldSchema = UiAttribute;

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
