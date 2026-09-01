import type { z } from 'zod';
import type { CustomerToolActor } from './actor';

export interface FlexkitToolManifest {
  description: string;
  inputSchema: { [key: string]: unknown };
  name: string;
}

export interface FlexkitTool {
  description: string;
  execute: (_input: unknown, _actor: CustomerToolActor) => Promise<unknown> | unknown;
  input: z.ZodType;
  name: string;
}

export interface FlexkitHandlerOptions {
  /** Project id used by the localhost dev connect poller. */
  projectId?: string;
  tools?: FlexkitTool[];
}

export interface CustomerToolsIntrospectResponse {
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
