import { z } from 'zod';
import type { CustomerToolActor } from './actor';
import { stripJsonSchemaMeta } from './json-schema';
import { isValidToolName } from './reserved-names';
import type { FlexkitTool } from './types';

export function defineTool<TSchema extends z.ZodType>(options: {
  description: string;
  execute: (_input: z.infer<TSchema>, _actor: CustomerToolActor) => Promise<unknown> | unknown;
  input: TSchema;
  name: string;
}): FlexkitTool {
  if (!isValidToolName(options.name)) {
    throw new Error(
      `Invalid custom tool name "${options.name}". Use a camelCase identifier that does not collide with a Flexkit platform tool.`
    );
  }

  if (!options.description.trim()) {
    throw new Error(`Custom tool "${options.name}" must have a description.`);
  }

  return {
    description: options.description.trim(),
    execute: (input, actor) => options.execute(input as z.infer<TSchema>, actor),
    input: options.input,
    name: options.name,
  };
}

export function toolToManifest(tool: FlexkitTool): {
  description: string;
  inputSchema: { [key: string]: unknown };
  name: string;
} {
  const inputSchema = stripJsonSchemaMeta(
    z.toJSONSchema(tool.input, { target: 'draft-07' })
  ) as { [key: string]: unknown };

  return {
    description: tool.description,
    inputSchema,
    name: tool.name,
  };
}
