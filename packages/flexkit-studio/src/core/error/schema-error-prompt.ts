/** The parts of a Schema mismatch message: one summary line, one hint line, then `- ` details. */
export type SchemaErrorParts = { summary: string; hint: string | null; details: string[] };

export function parseSchemaErrorMessage(message: string): SchemaErrorParts {
  const [summary = '', hint, ...details] = message.split('\n');

  return {
    summary,
    hint: hint?.trim() ? hint : null,
    details: details.map((detail) => detail.replace(/^- /, '')).filter((detail) => detail.trim().length > 0),
  };
}

/** Schema changes are refused to any other role (see the agent's schema tool). */
export function canChangeSchema(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'developer';
}

/**
 * The message "Ask the agent" types into a new chat. It names the page and
 * quotes the API's own errors, which carry the field and type names the agent
 * needs to find the attribute in the schema.
 */
export function schemaErrorPrompt({ details, pagePath }: { details: string[]; pagePath: string }): string {
  const errors = details.length > 0 ? details.map((detail) => `- ${detail}`).join('\n') : '- (no details were given)';

  return [
    `Studio shows a "Schema mismatch" error on ${pagePath}, and reloading the page does not fix it. The project API rejects the query Studio builds from the schema:`,
    '',
    errors,
    '',
    'Find the attributes in the schema that cause this and explain what is wrong with them. Then propose a schema change that fixes them without losing data. If the fix needs anything else from me, tell me.',
  ].join('\n');
}
