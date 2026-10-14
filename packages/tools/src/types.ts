import type { z } from 'zod';
import type { CustomerToolActor } from './actor';

export interface FlexkitToolManifest {
  description: string;
  inputSchema: { [key: string]: unknown };
  name: string;
}

export interface FlexkitSkill {
  content: string;
  description: string;
  name: string;
  space?: string;
}

export interface FlexkitTool {
  description: string;
  execute: (_input: unknown, _actor: CustomerToolActor) => Promise<unknown> | unknown;
  input: z.ZodType;
  /** JSON Schema (draft-07) of `input`, computed when the tool is defined. */
  inputSchema: { [key: string]: unknown };
  name: string;
}

/** The default export of `flexkit.tools.ts`: what `createToolsHandler` serves and `flexkit dev` runs. */
export interface FlexkitToolsDefinition {
  skills: FlexkitSkill[];
  tools: FlexkitTool[];
}

export interface CustomerToolsIntrospectResponse {
  skills: FlexkitSkill[];
  tools: FlexkitToolManifest[];
}

export interface CustomerToolsExecuteRequest {
  actor: CustomerToolActor;
  arguments: { [key: string]: unknown };
  name: string;
}

export interface CustomerToolsExecuteResponse {
  result: unknown;
}
