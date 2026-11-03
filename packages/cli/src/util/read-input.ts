import fs from 'node:fs';
import path from 'node:path';
import type Client from './client';

/** Reads all of stdin as text. */
export async function readStdin(client: Client): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of client.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }

  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Resolves a text argument that may be inline text, a file path, `@file`, or
 * `-` for stdin. A bare value is read as a file only when that file exists.
 */
export async function readTextInput(client: Client, value: string): Promise<string> {
  if (value === '-') {
    return readStdin(client);
  }

  if (value.startsWith('@')) {
    return fs.readFileSync(path.resolve(client.cwd, value.slice(1)), 'utf8');
  }

  const candidate = path.resolve(client.cwd, value);

  if (value.length < 4096 && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return fs.readFileSync(candidate, 'utf8');
  }

  return value;
}

/** Parses JSON from inline text, a file, `@file` or stdin (`-`), with a readable error. */
export async function readJsonInput<T = unknown>(client: Client, value: string, label = 'input'): Promise<T> {
  const text = await readTextInput(client, value);

  try {
    return JSON.parse(text) as T;
  } catch (err: unknown) {
    throw new Error(`The ${label} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parses `key=value` pairs (`--var`, `--set`). Values are read as JSON when
 * they parse (`count=3`, `active=true`, `tags=["a"]`) and as strings otherwise.
 * Dotted keys build nested objects: `price.amount=10`.
 */
export function parseKeyValues(pairs: string[] | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const pair of pairs ?? []) {
    const index = pair.indexOf('=');

    if (index <= 0) {
      throw new Error(`Expected key=value, got "${pair}".`);
    }

    const key = pair.slice(0, index);
    const raw = pair.slice(index + 1);
    let value: unknown = raw;

    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }

    const parts = key.split('.');
    let target = result;

    for (const part of parts.slice(0, -1)) {
      const next = target[part];

      if (typeof next !== 'object' || next === null || Array.isArray(next)) {
        target[part] = {};
      }

      target = target[part] as Record<string, unknown>;
    }

    target[parts[parts.length - 1] as string] = value;
  }

  return result;
}
