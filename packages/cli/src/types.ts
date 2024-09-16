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
  currentTeam?: string;
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
  | 'time';

type InputType = 'datetime' | 'editor' | 'number' | 'relationship' | 'select' | 'switch' | 'text' | 'textarea';

type ScopeType = 'local' | 'global' | 'relationship';

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
  isSearchable?: boolean;
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
};

export interface ProjectOptions {
  title?: string;
  projectId: string;
  basePath: string;
  scopes?: Scopes;
  schema: {
    name: string;
    plural: string;
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
      attributes: Attribute[];
    }[];
    scopes?: Scopes;
    title?: string;
    projectId: string;
  }[];
}
