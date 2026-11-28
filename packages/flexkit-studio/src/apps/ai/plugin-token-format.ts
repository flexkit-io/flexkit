import type { MarketplacePlugin, PluginCredentialField, PluginCredentialsConnect } from './plugin-types';

export type ConnectablePlugin = Pick<MarketplacePlugin, 'connect' | 'id' | 'name'>;

/** Longer than any credential a provider issues; the server rejects more. */
export const MAX_CREDENTIAL_VALUE_LENGTH = 4096;

/**
 * The secrets a plugin's connect form takes that can be recognized on their
 * own (a distinctive prefix, say), each with that pattern and what to call it.
 */
export function pluginSecretFormats(plugin: ConnectablePlugin): Array<{ label: string; pattern: string }> {
  const { connect } = plugin;

  if (connect?.type === 'api-token') {
    return connect.pattern ? [{ label: connect.tokenLabel, pattern: connect.pattern }] : [];
  }

  if (connect?.type === 'credentials') {
    return [...connect.fields, ...connect.methods.flatMap((method) => method.fields)]
      .filter((field) => field.kind === 'secret' && field.detect)
      .map((field) => ({ label: field.label, pattern: field.detect! }));
  }

  return [];
}

/** The fields a credentials form shows: the shared ones, then those of the chosen method. */
export function credentialFormFields(connect: PluginCredentialsConnect, method: string | null): PluginCredentialField[] {
  const selected = connect.methods.find((item) => item.key === method);

  return [...connect.fields, ...(selected?.fields ?? [])];
}

/** Whether every required field has a value: what the Connect button waits for. */
export function credentialFormComplete(
  fields: readonly PluginCredentialField[],
  values: { [key: string]: string }
): boolean {
  return fields.every((field) => !field.required || Boolean(values[field.key]?.trim()));
}

/** The first problem with the values entered, or null when they can be submitted. */
export function credentialFormError(
  fields: readonly PluginCredentialField[],
  values: { [key: string]: string }
): { field: string; message: string } | null {
  for (const field of fields) {
    const value = values[field.key]?.trim() ?? '';

    if (!value) {
      if (field.required) {
        return { field: field.key, message: `Enter the ${field.label}.` };
      }

      continue;
    }

    if (value.length > MAX_CREDENTIAL_VALUE_LENGTH) {
      return { field: field.key, message: `The ${field.label} is too long; paste only the value.` };
    }

    if (!matchesTokenPattern(value, field.pattern)) {
      return { field: field.key, message: `That is not a valid ${field.label}.` };
    }
  }

  return null;
}

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
 * The first plugin whose secret format `text` contains, if any, with every
 * secret-shaped word in the message and what the plugin calls that secret: a
 * token pasted into the chat would be stored in the conversation and sent to
 * the model.
 */
export function findPastedPluginToken(
  text: string,
  plugins: readonly ConnectablePlugin[]
): { plugin: ConnectablePlugin; tokens: string[]; label: string } | null {
  // A token is often glued to a label (`token=…`, `key: …`) or wrapped in
  // brackets, quotes or a sentence's punctuation; none of those are part of it.
  const words = text
    .split(/[\s"'`()<>[\]{},;:=!?&]+/)
    .map((word) => word.replace(/\.+$/, ''))
    .filter(Boolean);
  let found: { plugin: ConnectablePlugin; label: string } | null = null;
  const tokens = new Set<string>();

  for (const plugin of plugins) {
    for (const format of pluginSecretFormats(plugin)) {
      const pattern = compileTokenPattern(format.pattern);

      for (const word of pattern ? words : []) {
        if (pattern!.test(word)) {
          found ??= { plugin, label: format.label };
          tokens.add(word);
        }
      }
    }
  }

  return found ? { ...found, tokens: [...tokens] } : null;
}
