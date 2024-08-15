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

export const fileNameSymbol = Symbol('fileName');

export interface FlexkitConfig {
  [fileNameSymbol]?: string;
  name?: string;
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
