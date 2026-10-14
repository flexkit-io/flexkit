import type { DevConnectEvent } from '@flexkit/tools/dev';

/** One printable line per runtime event, or null for events that stay silent. */
export function formatDevEvent(event: DevConnectEvent, projectId: string): { level: 'error' | 'info' | 'warn'; text: string } | null {
  switch (event.type) {
    case 'connected':
      return {
        level: 'info',
        text: `Connected to ${projectId}: ${String(event.toolCount)} ${event.toolCount === 1 ? 'tool' : 'tools'}, ${String(event.skillCount)} ${event.skillCount === 1 ? 'skill' : 'skills'}. Waiting for tool calls…`,
      };
    case 'manifest-sent':
      return event.warnings.length > 0
        ? { level: 'warn', text: `Catalog sent with warnings:\n  - ${event.warnings.join('\n  - ')}` }
        : null;
    case 'job-start':
      return null;
    case 'job-done':
      return { level: 'info', text: `${event.name} ✓ ${String(event.ms)}ms` };
    case 'job-error':
      return { level: 'error', text: `${event.name} ✗ ${String(event.ms)}ms: ${event.error}` };
    case 'denied':
      return { level: 'error', text: event.message };
    case 'unreachable':
      return { level: 'warn', text: `${event.message} Retrying…` };
    case 'stopped':
      return null;
    default:
      return null;
  }
}
