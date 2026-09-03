export const CUSTOM_TOOL_NAME_PREFIX = 'custom_';

const TOOL_NAME_PATTERN = /^[a-z][a-zA-Z0-9_]*$/;

export function isValidToolName(name: string): boolean {
  return TOOL_NAME_PATTERN.test(name) && !name.startsWith(CUSTOM_TOOL_NAME_PREFIX);
}

export function toAgentToolName(name: string): string {
  return `${CUSTOM_TOOL_NAME_PREFIX}${name}`;
}
