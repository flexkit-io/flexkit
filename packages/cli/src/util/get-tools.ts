import fs from 'node:fs';
import path from 'node:path';
import type { FlexkitToolsDefinition } from '@flexkit/tools';
import { bundleAndImport } from './bundle-module';
import humanizePath from './humanize-path';
import type { Output } from './output';

export const TOOLS_FILE_CANDIDATES = ['flexkit.tools.ts', 'flexkit.tools.js', 'flexkit.tools.mjs'];

export class InvalidToolsFile extends Error {
  readonly file: string;

  constructor(message: string, file: string) {
    super(message);
    this.name = 'InvalidToolsFile';
    this.file = file;
  }
}

export class CantFindToolsFile extends Error {
  readonly searched: string[];

  constructor(searched: string[]) {
    super(`No tools file found. Looked for ${searched.join(', ')}.`);
    this.name = 'CantFindToolsFile';
    this.searched = searched;
  }
}

function isToolsDefinition(value: unknown): value is FlexkitToolsDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const { skills, tools } = value as { skills?: unknown; tools?: unknown };

  return (
    Array.isArray(tools) &&
    Array.isArray(skills) &&
    tools.every(
      (tool) =>
        Boolean(tool) &&
        typeof tool === 'object' &&
        typeof (tool as { name?: unknown }).name === 'string' &&
        typeof (tool as { execute?: unknown }).execute === 'function' &&
        typeof (tool as { inputSchema?: unknown }).inputSchema === 'object'
    )
  );
}

/** Finds `flexkit.tools.{ts,js,mjs}` in `cwd`, or validates an explicit path. */
export function resolveToolsFile(cwd: string, explicit?: string): string {
  if (explicit) {
    const resolved = path.resolve(cwd, explicit);

    if (!fs.existsSync(resolved)) {
      throw new CantFindToolsFile([humanizePath(resolved)]);
    }

    return resolved;
  }

  const found = TOOLS_FILE_CANDIDATES.map((candidate) => path.join(cwd, candidate)).find((candidate) =>
    fs.existsSync(candidate)
  );

  if (!found) {
    throw new CantFindToolsFile(TOOLS_FILE_CANDIDATES.map((candidate) => humanizePath(path.join(cwd, candidate))));
  }

  return found;
}

/**
 * Bundles and imports a tools file. `@flexkit/tools` and `zod` stay external so
 * the definition is built by the user's own copies: the JSON Schema in each
 * tool was computed by the same `zod` instance that validates its input.
 */
export async function loadToolsDefinition(output: Output, toolsFilePath: string): Promise<FlexkitToolsDefinition> {
  output.debug(`Loading tools from ${toolsFilePath}`);

  let loaded: { default?: unknown };

  try {
    loaded = await bundleAndImport<{ default?: unknown }>(toolsFilePath, {
      external: [/^@flexkit\/tools(\/.*)?$/, /^zod(\/.*)?$/],
    });
  } catch (error) {
    throw new InvalidToolsFile(error instanceof Error ? error.message : String(error), toolsFilePath);
  }

  if (loaded.default === undefined) {
    throw new InvalidToolsFile(
      'The tools file must export the result of defineTools() as default, e.g. `export default defineTools({ tools, skills })`.',
      toolsFilePath
    );
  }

  if (!isToolsDefinition(loaded.default)) {
    throw new InvalidToolsFile(
      'The default export is not a tools definition. Wrap your tools and skills with defineTools() from @flexkit/tools.',
      toolsFilePath
    );
  }

  return loaded.default;
}
