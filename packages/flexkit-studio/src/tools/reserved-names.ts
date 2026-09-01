export const CUSTOM_TOOL_NAME_PREFIX = 'custom_';

const RESERVED_TOOL_NAMES: { [name: string]: true } = {
  composeChatMessage: true,
  createSandbox: true,
  executeGraphqlQuery: true,
  generateFiles: true,
  generateHtmlArtifact: true,
  generatePdfArtifact: true,
  loadSkill: true,
  proposeGraphqlMutation: true,
  publishArtifact: true,
  runCommand: true,
  searchSchema: true,
  serve: true,
  startBulkGraphqlAction: true,
  tools: true,
  updateMemory: true,
  validateGraphql: true,
  webSearch: true,
};

const TOOL_NAME_PATTERN = /^[a-z][a-zA-Z0-9_]*$/;

export function isReservedToolName(name: string): boolean {
  return Boolean(RESERVED_TOOL_NAMES[name]) || name.startsWith(CUSTOM_TOOL_NAME_PREFIX);
}

export function isValidToolName(name: string): boolean {
  return TOOL_NAME_PATTERN.test(name) && !isReservedToolName(name);
}

export function toAgentToolName(name: string): string {
  return `${CUSTOM_TOOL_NAME_PREFIX}${name}`;
}
