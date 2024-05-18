import type { ZodTypeAny } from 'zod';

export type RelationshipConnection = {
  _id: string;
  value: {
    [attributeName: string]: string;
  };
};

export type Relationships = {
  [relationshipId: string]:
    | {
        connect?: RelationshipConnection[];
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

type ActionType = 'setScope' | 'setRelationship';

export type ActionSetScope = {
  type: ActionType['setScope'];
  payload: string;
};

type Connection = {
  _id: string;
  value:
    | string
    | { [key: string]: string | number | readonly string[] | undefined }
    | { [key: string]: string | number | boolean | { [key: string]: string | number | boolean } }[];
};

export type ActionSetRelationship = {
  type: ActionType['setRelationship'];
  payload: {
    [relationshipId: string]: {
      connect: Connection | Connection[];
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
  | 'time';

export type InputType = 'datetime' | 'number' | 'relationship' | 'select' | 'switch' | 'text' | 'textarea';

type SelectList = {
  label: string;
  value: string;
};

type GroupedSelectList = {
  groupLabel: string;
  items: SelectList[];
};

export type Attribute = {
  dataType: DataType;
  defaultValue?: string;
  inputType: InputType;
  isEditable?: boolean;
  isPrimary?: boolean;
  isUnique?: boolean;
  label: string;
  name: string;
  options?: {
    comment?: string;
    list?: SelectList[] | GroupedSelectList[];
    placeholder?: string;
    size?: number;
  };
  relationship?: {
    entity: string;
    mode: 'single' | 'multiple';
    field: string;
  };
  scope: ScopeType;
  validation?: (z) => ZodTypeAny;
};

export type Entity = {
  name: string;
  plural: string;
  attributes: Attribute[];
};

export type Schema = Entity[];

type Scope = {
  name: string;
  isDefault?: boolean;
  sortOrder: number;
  enabled: boolean;
};

export type Scopes = {
  [code: string]: Scope;
};

type FormFieldNameAndType = {
  _typename: string;
  _fieldName: string;
};

export type FormFieldSchema = Attribute;

export type GridEntityRow = {
  [attributeName: string]: string;
};
