import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import parseArguments from '../../util/parse-args';
import type Client from '../../util/client';
import { help } from '../help';
import { reportError, SHARED_FLAGS } from '../../util/command-group';
import { resolveProjectId } from '../../util/project-context';
import { parseKeyValues, readTextInput } from '../../util/read-input';
import { apiCommand } from './command';

const FLAGS = {
  ...SHARED_FLAGS,
  '--method': String,
  '-X': '--method',
  '--data': String,
  '--field': [String] as [StringConstructor],
  '-F': '--field',
  '--query': [String] as [StringConstructor],
  '-q': '--query',
  '--header': [String] as [StringConstructor],
  '-H': '--header',
  '--include': Boolean,
  '-i': '--include',
};

/** Splits `/path?x=1` and appends repeated `--query` pairs. */
export function buildApiPath(rawPath: string, queryPairs: string[] | undefined): string {
  const normalized = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const url = new URL(normalized, 'https://placeholder.invalid');

  for (const pair of queryPairs ?? []) {
    const index = pair.indexOf('=');

    if (index <= 0) {
      throw new Error(`Expected key=value for --query, got "${pair}".`);
    }

    url.searchParams.append(pair.slice(0, index), pair.slice(index + 1));
  }

  return `${url.pathname}${url.search}`;
}

/** Account API paths start with /api/; everything else belongs to a project. */
export function isAccountApiPath(apiPath: string): boolean {
  return apiPath === '/api' || apiPath.startsWith('/api/');
}

function readFieldFiles(client: Client, pairs: string[] | undefined): string[] {
  return (pairs ?? []).map((pair) => {
    const index = pair.indexOf('=');
    const value = index > 0 ? pair.slice(index + 1) : '';

    if (!value.startsWith('@')) {
      return pair;
    }

    const content = fs.readFileSync(path.resolve(client.cwd, value.slice(1)), 'utf8');

    // Keep file contents as a string even when they happen to parse as JSON.
    return `${pair.slice(0, index)}=${JSON.stringify(content)}`;
  });
}

export default async function main(client: Client): Promise<number> {
  const { output } = client;
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), FLAGS);
  } catch (err: unknown) {
    output.error(err instanceof Error ? err.message : String(err));

    return 1;
  }

  if (argv.flags['--help'] || !argv.args[1]) {
    output.print(help(apiCommand, { columns: client.stderr.columns }));

    return argv.flags['--help'] ? 2 : 1;
  }

  try {
    const apiPath = buildApiPath(argv.args[1], argv.flags['--query']);
    let projectId: string | undefined;

    if (!isAccountApiPath(apiPath)) {
      const resolved = resolveProjectId(client, argv.flags['--project']);

      if (!resolved) {
        return 1;
      }

      ({ projectId } = resolved);
    }

    const headers = new Headers();

    for (const header of argv.flags['--header'] ?? []) {
      const index = header.indexOf(':');

      if (index <= 0) {
        throw new Error(`Expected "Name: value" for --header, got "${header}".`);
      }

      headers.set(header.slice(0, index).trim(), header.slice(index + 1).trim());
    }

    let body: string | undefined;

    if (argv.flags['--data'] !== undefined) {
      body = await readTextInput(client, argv.flags['--data']);
    }

    const fields = argv.flags['--field'];

    if (fields && fields.length > 0) {
      const base: unknown = body ? JSON.parse(body) : {};
      const merged = { ...(base as Record<string, unknown>), ...parseKeyValues(readFieldFiles(client, fields)) };
      body = JSON.stringify(merged);
    }

    if (body !== undefined && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const method = (argv.flags['--method'] ?? (body === undefined ? 'GET' : 'POST')).toUpperCase();
    const response = await client.rawFetch(apiPath, { method, headers, body, projectId });

    if (argv.flags['--include']) {
      output.print(`${chalk.bold(`HTTP ${response.status} ${response.statusText}`)}\n`);
      response.headers.forEach((value, name) => {
        output.print(`${chalk.dim(name)}: ${value}\n`);
      });
      output.print('\n');
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json') && text) {
      try {
        client.stdout.write(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
      } catch {
        client.stdout.write(`${text}\n`);
      }
    } else if (text) {
      client.stdout.write(text.endsWith('\n') ? text : `${text}\n`);
    }

    if (!response.ok) {
      output.error(`Request failed with HTTP ${response.status} ${response.statusText}`.trim());

      return 1;
    }

    return 0;
  } catch (err: unknown) {
    return reportError(client, err);
  }
}
