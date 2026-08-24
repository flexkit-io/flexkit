import type { Readable, Writable } from 'node:stream';
import type * as tty from 'node:tty';

export interface AuthConfig {
  '// Note'?: string;
  '// Docs'?: string;
  token?: string;
  skipWrite?: boolean;
}

export interface GlobalConfig {
  '// Note'?: string;
  '// Docs'?: string;
  collectMetrics?: boolean;
  api?: string;
}

export type Primitive = bigint | boolean | null | number | string | symbol | undefined;

export type JSONArray = JSONValue[];

export type JSONValue = Primitive | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}

export interface ReadableTTY extends Readable {
  isTTY?: boolean;
  isRaw?: boolean;
  setRawMode?: (mode: boolean) => void;
}

export interface WritableTTY extends Writable {
  isTTY?: boolean;
}

export interface Stdio {
  stdin: ReadableTTY;
  stdout: tty.WriteStream;
  stderr: tty.WriteStream;
}

export interface PaginationOptions {
  /**
   * Amount of items in the current page.
   * @example 20
   */
  count: number;
  /**
   * Timestamp that must be used to request the next page.
   * @example 1540095775951
   */
  next: number | null;
  /**
   * Timestamp that must be used to request the previous page.
   * @example 1540095775951
   */
  prev: number | null;
}

type Scope = {
  name: string;
  label: string;
  isDefault?: boolean;
  sortOrder?: number;
};

export type Scopes = Scope[];

export type Space = {
  code: string;
  label: string;
};

export type Spaces = Space[];

type DataType =
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

type DefaultValueByDataType = {
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

type InputType =
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

type PreviewType =
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

type CommonOptions = {
  comment?: string;
  size?: number;
  placeholder?: string;
};

type SelectOptions = CommonOptions & {
  list: SelectList[] | GroupedSelectList[];
};

type AssetOptions = CommonOptions & {
  accept?: string;
};

type RelationshipOptions = CommonOptions & {
  accept?: string;
};

type DateTimeOptions = CommonOptions & {
  format?: string;
};

type NumberOptions = CommonOptions & {
  min?: number;
  max?: number;
};

export type AttributeOptions = {
  select: SelectOptions;
  asset: AssetOptions;
  datetime: DateTimeOptions;
  number: NumberOptions;
  relationship: RelationshipOptions;
  [key: string]: CommonOptions;
};

type AttributeBase = {
  inputType: InputType;
  previewType?: PreviewType;
  hidden?: boolean;
  readOnly?: boolean;
  unique?: boolean;
  searchable?: boolean;
  label: string;
  name: string;
  options?: AttributeOptions[InputType];
  relationship?: {
    entity: string;
    mode: 'single' | 'multiple';
    field: string;
  };
};

/**
 * Space codes that can read/write this attribute. Not allowed on relationship
 * attributes (`scope: 'relationship'`): bind the related entity instead.
 */
type AttributeSpaces = {
  spaces?: string[];
};

type AttributeScopeAndSpaces =
  | {
      scope: 'relationship';
      spaces?: never;
    }
  | ({
      scope: 'local' | 'global';
    } & AttributeSpaces);

type AttributeByDataType<T extends DataType> = AttributeBase & {
  dataType: T;
  defaultValue?: DefaultValueByDataType[T];
} & (T extends 'asset' ? { scope?: 'global' } & AttributeSpaces : AttributeScopeAndSpaces);

export type Attribute = {
  [T in DataType]: AttributeByDataType<T>;
}[DataType];

export interface ProjectOptions {
  title?: string;
  projectId: string;
  basePath: string;
  menuGroups?: {
    title: string;
    name: string;
  }[];
  scopes?: Scopes;
  spaces?: Spaces;
  schema: {
    name: string;
    plural: string;
    display?: string;
    menu?:
      | { hidden: true; label?: string }
      | {
          label?: string;
          group?: string;
        };
    spaces?: string[];
    attributes: Attribute[];
  }[];
}

/**
 * If a single project is used, not specifying a basePath is acceptable
 */
export type SingleProject = Omit<ProjectOptions, 'basePath'> & {
  basePath?: string;
};

export type ProjectConfig = SingleProject | ProjectOptions[];

export const fileNameSymbol = Symbol('fileName');

export interface FlexkitConfig {
  [fileNameSymbol]?: string;
  projects: {
    schema?: {
      name: string;
      plural: string;
      display?: string;
      spaces?: string[];
      attributes: Attribute[];
    }[];
    scopes?: Scopes;
    spaces?: Spaces;
    title?: string;
    projectId: string;
  }[];
}
