import type { Agent } from 'node:http';
import type * as tty from 'node:tty';
import { gray } from 'chalk';
import checkbox from '@inquirer/checkbox';
import confirm from '@inquirer/confirm';
import expand from '@inquirer/expand';
import input from '@inquirer/input';
import select from '@inquirer/select';
import { EventEmitter } from 'events';
import { URL } from 'url';
import { AuthConfig, FlexkitConfig, GlobalConfig, JSONObject, Stdio, ReadableTTY, PaginationOptions } from '../types';
import retry, { RetryFunction, Options as RetryOptions } from 'async-retry';
import fetch, { Headers } from 'node-fetch';
import type { BodyInit, RequestInit, Response } from 'node-fetch';
import userAgent from './user-agent';
import { Output } from './output/create-output';
import responseError from './error-utils';
import sleep from './sleep';

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | JSONObject;
  json?: boolean;
  retry?: RetryOptions;
  projectId?: string;
}

export interface ClientOptions extends Stdio {
  argv: string[];
  apiUrl: string;
  authConfig: AuthConfig;
  output: Output;
  config: GlobalConfig;
  localConfig?: FlexkitConfig;
  localConfigPath?: string;
  agent?: Agent;
}

export const isJSONObject = (v: any): v is JSONObject => {
  return v && typeof v == 'object' && v.constructor === Object;
};

export default class Client extends EventEmitter implements Stdio {
  argv: string[];
  apiUrl: string;
  authConfig: AuthConfig;
  stdin: ReadableTTY;
  stdout: tty.WriteStream;
  stderr: tty.WriteStream;
  output: Output;
  config: GlobalConfig;
  agent?: Agent;
  localConfig?: FlexkitConfig;
  localConfigPath?: string;
  requestIdCounter: number;
  input: {
    text: typeof input;
    checkbox: typeof checkbox;
    expand: typeof expand;
    confirm: typeof confirm;
    select: typeof select;
  };

  constructor(opts: ClientOptions) {
    super();
    this.agent = opts.agent;
    this.argv = opts.argv;
    this.apiUrl = opts.apiUrl;
    this.authConfig = opts.authConfig;
    this.stdin = opts.stdin;
    this.stdout = opts.stdout;
    this.stderr = opts.stderr;
    this.output = opts.output;
    this.config = opts.config;
    this.localConfig = opts.localConfig;
    this.localConfigPath = opts.localConfigPath;
    this.requestIdCounter = 1;

    const theme = {
      prefix: gray('?'),
      style: { answer: gray },
    };
    this.input = {
      text: (opts: Parameters<typeof input>[0]) =>
        input({ theme, ...opts }, { input: this.stdin, output: this.stderr }),
      checkbox: <T>(opts: Parameters<typeof checkbox<T>>[0]) =>
        checkbox<T>({ theme, ...opts }, { input: this.stdin, output: this.stderr }),
      expand: (opts: Parameters<typeof expand>[0]) =>
        expand({ theme, ...opts }, { input: this.stdin, output: this.stderr }),
      confirm: (opts: Parameters<typeof confirm>[0]) =>
        confirm({ theme, ...opts }, { input: this.stdin, output: this.stderr }),
      select: <T>(opts: Parameters<typeof select<T>>[0]) =>
        select<T>({ theme, ...opts }, { input: this.stdin, output: this.stderr }),
    };
  }

  retry<T>(fn: RetryFunction<T>, { retries = 3, maxTimeout = Infinity } = {}) {
    return retry(fn, {
      retries,
      maxTimeout,
      onRetry: this._onRetry,
    });
  }

  private _fetch(_url: string, opts: FetchOptions = {}) {
    const url = new URL(_url, this.apiUrl);

    if (opts.projectId) {
      // TODO: change the URL to include the project ID as a subdomain
    }

    const headers = new Headers(opts.headers);
    headers.set('user-agent', userAgent);

    if (this.authConfig.token) {
      headers.set('authorization', `Bearer ${this.authConfig.token}`);
    }

    let body;

    if (isJSONObject(opts.body)) {
      body = JSON.stringify(opts.body);
      headers.set('content-type', 'application/json; charset=utf-8');
    } else {
      body = opts.body;
    }

    const requestId = this.requestIdCounter++;

    return this.output.time(
      (res) => {
        if (res) {
          return `#${requestId} ← ${res.status} ${res.statusText}: ${res.headers.get('x-vercel-id')}`;
        } else {
          return `#${requestId} → ${opts.method || 'GET'} ${url.href}`;
        }
      },
      fetch(url, { agent: this.agent, ...opts, headers, body })
    );
  }

  fetch(url: string, opts: FetchOptions & { json: false }): Promise<Response>;
  fetch<T>(url: string, opts?: FetchOptions): Promise<T>;
  fetch(url: string, opts: FetchOptions = {}) {
    return this.retry(async (bail) => {
      const res = await this._fetch(url, opts);

      if (!res.ok) {
        const error = await responseError(res);

        if (res.status >= 400 && res.status < 500) {
          return bail(error);
        }

        // Retry
        throw error;
      }

      if (opts.json === false) {
        return res;
      }

      const contentType = res.headers.get('content-type');
      if (!contentType) {
        return null;
      }

      return contentType.includes('application/json') ? res.json() : res;
    }, opts.retry);
  }

  async *fetchPaginated<T>(
    url: string | URL,
    opts?: FetchOptions
  ): AsyncGenerator<T & { pagination: PaginationOptions }> {
    const endpoint = typeof url === 'string' ? new URL(url, this.apiUrl) : new URL(url.href);
    if (!endpoint.searchParams.has('limit')) {
      endpoint.searchParams.set('limit', '100');
    }
    let next: number | null | undefined;
    do {
      if (next) {
        // Small sleep to avoid rate limiting
        await sleep(100);
        endpoint.searchParams.set('until', String(next));
      }
      const res = await this.fetch<T & { pagination: PaginationOptions }>(endpoint.href, opts);
      yield res;
      next = res.pagination?.next;
    } while (next);
  }

  _onRetry = (error: Error) => {
    this.output.debug(`Retrying: ${error}\n${error.stack}`);
  };

  get cwd(): string {
    return process.cwd();
  }

  set cwd(v: string) {
    process.chdir(v);
  }
}
