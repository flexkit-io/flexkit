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

/** A pattern that compiles; an empty or broken one detects nothing rather than every word. */
function compileTokenPattern(pattern: string | null): RegExp | null {
  if (!pattern) {
    return null;
  }

  try {
    return new RegExp(pattern, 'u');
  } catch {
    return null;
  }
}

/**
 * The first plugin whose token format `text` contains, if any, with every
 * token-shaped word in the message: a token pasted into the chat would be
 * stored in the conversation and sent to the model.
 */
export function findPastedPluginToken(
  text: string,
  plugins: readonly ConnectablePlugin[]
): { plugin: ConnectablePlugin; tokens: string[] } | null {
  // A token is often glued to a label (`token=…`, `key: …`) or wrapped in
  // brackets, quotes or a sentence's punctuation; none of those are part of it.
  const words = text
    .split(/[\s"'`()<>[\]{},;:=!?&]+/)
    .map((word) => word.replace(/\.+$/, ''))
    .filter(Boolean);
  let found: ConnectablePlugin | null = null;
  const tokens = new Set<string>();

  for (const plugin of plugins) {
    const pattern = compileTokenPattern(plugin.connect?.type === 'api-token' ? plugin.connect.pattern : null);

    for (const word of pattern ? words : []) {
      if (pattern!.test(word)) {
        found ??= plugin;
        tokens.add(word);
      }
    }
  }

  return found ? { plugin: found, tokens: [...tokens] } : null;
}
