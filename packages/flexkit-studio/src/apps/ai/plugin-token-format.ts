import type { MarketplacePlugin } from './plugin-types';

export type ConnectablePlugin = Pick<MarketplacePlugin, 'connect' | 'id' | 'name'>;

export function matchesTokenPattern(token: string, pattern: string | null): boolean {
  if (!pattern) {
    return true;
  }

  try {
    return new RegExp(pattern, 'u').test(token);
  } catch {
    // The server validates the pattern when it admits the plugin; never block on a bad one here.
    return true;
  }
}

/**
 * The plugin whose token format `text` contains, if any, with the matching
 * token: a token pasted into the chat would be stored in the conversation and
 * sent to the model.
 */
export function findPastedPluginToken(
  text: string,
  plugins: readonly ConnectablePlugin[]
): { plugin: ConnectablePlugin; token: string } | null {
  // Quotes and trailing punctuation around a pasted token are not part of it.
  const words = text
    .split(/\s+/)
    .map((word) => word.replace(/^["'`]+|["'`.,;]+$/g, ''))
    .filter(Boolean);

  for (const plugin of plugins) {
    const pattern = plugin.connect?.type === 'api-token' ? plugin.connect.pattern : null;
    const token = pattern === null ? undefined : words.find((word) => matchesTokenPattern(word, pattern));

    if (token) {
      return { plugin, token };
    }
  }

  return null;
}
