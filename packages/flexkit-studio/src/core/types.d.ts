export type RelationshipConnection = {
  _id: string;
  row: {
    [attributeName: string]: string;
  };
};

export type Relationships = {
  [relationshipId: string]: {
    connect: RelationshipConnection[];
    disconnect: string[];
  };
};

export type AppContextType = {
  isRouteLoading: boolean;
  pageTitle: string;
  scope: string;
  relationships: Relationships;
};

type ActionType = 'set_scope' | 'set_relationship';

export type AppAction = {
  type: ActionType;
  payload: typeof initialState;
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
    list?: {
      label: string;
      value: string;
    }[];
    size?: number;
  };
  relationship?: {
    entity: string;
    mode: 'single' | 'multiple';
    field: string;
  };
  scope: ScopeType;
  validation?: (z) => unknown;
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

export type FormFieldSchema = FormFieldNameAndType & Attribute;

export type GridEntityRow = {
  [attributeName: string]: string;
};
