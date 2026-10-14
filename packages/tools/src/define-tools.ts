import { assertUniqueSkillNames } from './define-skill';
import { assertUniqueToolNames } from './define-tool';
import type { FlexkitSkill, FlexkitTool, FlexkitToolsDefinition } from './types';

/**
 * Bundles tools and code skills into the shape `createToolsHandler` serves and
 * `flexkit dev` loads. Use it as the default export of `flexkit.tools.ts`.
 */
export function defineTools(options: { skills?: FlexkitSkill[]; tools?: FlexkitTool[] } = {}): FlexkitToolsDefinition {
  const tools = options.tools ?? [];
  const skills = options.skills ?? [];

  assertUniqueToolNames(tools);
  assertUniqueSkillNames(skills);

  return Object.freeze({ skills: [...skills], tools: [...tools] });
}

export function isToolsDefinition(value: unknown): value is FlexkitToolsDefinition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const { skills, tools } = value as { skills?: unknown; tools?: unknown };

  return (
    Array.isArray(tools) &&
    Array.isArray(skills) &&
    tools.every(
      (tool) =>
        tool &&
        typeof tool === 'object' &&
        typeof (tool as FlexkitTool).name === 'string' &&
        typeof (tool as FlexkitTool).execute === 'function' &&
        typeof (tool as FlexkitTool).inputSchema === 'object'
    )
  );
}
