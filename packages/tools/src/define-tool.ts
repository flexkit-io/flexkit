import { z } from 'zod';
import type { CustomerToolActor } from './actor';
import { stripJsonSchemaMeta } from './json-schema';
import { isValidToolName } from './tool-names';
import type { FlexkitTool, FlexkitToolManifest } from './types';

function toInputSchema(input: z.ZodType): { [key: string]: unknown } {
  return stripJsonSchemaMeta(z.toJSONSchema(input, { target: 'draft-07' })) as { [key: string]: unknown };
}

/**
 * Defines a custom tool. The JSON Schema published in the catalog is computed
 * here, with the same `zod` that built `input`, so runtimes that load the
 * tools file (such as `flexkit dev`) never convert a foreign schema instance.
 */
export function defineTool<TSchema extends z.ZodType>(options: {
  description: string;
  execute: (_input: z.infer<TSchema>, _actor: CustomerToolActor) => Promise<unknown> | unknown;
  input: TSchema;
  name: string;
}): FlexkitTool {
  if (!isValidToolName(options.name)) {
    throw new Error(
      `Invalid custom tool name "${options.name}". Use a camelCase identifier that does not start with \`custom_\`.`
    );
  }

  if (!options.description.trim()) {
    throw new Error(`Custom tool "${options.name}" must have a description.`);
  }

  return {
    description: options.description.trim(),
    execute: (input, actor) => options.execute(input as z.infer<TSchema>, actor),
    input: options.input,
    inputSchema: toInputSchema(options.input),
    name: options.name,
  };
}

export function toolToManifest(tool: FlexkitTool): FlexkitToolManifest {
  return {
    description: tool.description,
    inputSchema: tool.inputSchema,
    name: tool.name,
  };
}

export function assertUniqueToolNames(tools: FlexkitTool[]): void {
  const names = new Set<string>();

  for (const tool of tools) {
    if (names.has(tool.name)) {
      throw new Error(`Duplicate custom tool name "${tool.name}".`);
    }

    names.add(tool.name);
  }
}
