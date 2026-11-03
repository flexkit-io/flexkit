import chalk from 'chalk';

function toText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function indent(text: string, prefix = '  '): string {
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

/** A tool result's output (`{ type: 'json' | 'text' | 'error-text' …, value }`) as text. */
function toolOutputText(output: unknown): string {
  const record = output as { type?: unknown; value?: unknown } | null;

  if (record && typeof record === 'object' && 'value' in record) {
    return toText(record.value);
  }

  return toText(output);
}

function renderPart(part: unknown): string {
  const record = (part ?? {}) as Record<string, unknown>;

  switch (record.type) {
    case 'text':
      return toText(record.text);
    case 'reasoning':
      return chalk.dim(`(thinking) ${toText(record.text)}`);
    case 'tool-call':
      return chalk.cyan(`→ ${toText(record.toolName)}`) + chalk.dim(`\n${indent(toText(record.input ?? record.args))}`);
    case 'tool-result':
      return chalk.dim(`← ${toText(record.toolName)}\n${indent(toolOutputText(record.output ?? record.result))}`);
    case 'image':
    case 'file':
      return chalk.dim(`[${String(record.type)}${typeof record.mediaType === 'string' ? ` ${record.mediaType}` : ''}]`);
    default:
      return chalk.dim(toText(part));
  }
}

/**
 * Renders a stored model transcript (AI SDK `ModelMessage[]`) as readable
 * text: one block per message with its role, text, tool calls and results.
 */
export function renderTranscript(messages: unknown[]): string {
  return messages
    .map((message) => {
      const record = (message ?? {}) as { role?: unknown; content?: unknown };
      const role = typeof record.role === 'string' ? record.role : 'message';
      const content = Array.isArray(record.content)
        ? record.content.map(renderPart).filter(Boolean).join('\n')
        : toText(record.content);

      return `${chalk.bold(role.toUpperCase())}\n${content}\n`;
    })
    .join('\n');
}
