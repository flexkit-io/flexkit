import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { startDevConnect, type DevConnectEvent } from '../src/dev/index';
import { defineTool, defineTools } from '../src/index';

const definition = defineTools({
  tools: [
    defineTool({
      name: 'ping',
      description: 'Echo.',
      input: z.object({ message: z.string() }),
      execute: ({ message }) => ({ echo: message }),
    }),
  ],
});

interface Call {
  body?: unknown;
  method: string;
  path: string;
  token: string | null;
}

function fakeBackend(responses: { poll: () => unknown; hello?: () => Response }) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    calls.push({
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      method: init?.method ?? 'GET',
      path: url.pathname,
      token: headers.get('Authorization'),
    });

    if (url.pathname.endsWith('/hello')) {
      return responses.hello?.() ?? Response.json({ ok: true, warnings: ['skill skipped'] });
    }

    if (url.pathname.endsWith('/poll')) {
      return Response.json({ job: responses.poll() });
    }

    return Response.json({ ok: true });
  };

  return { calls, fetchImpl };
}

const options = {
  apiOrigin: 'https://abcdefghij.api.flexkit.test/',
  clientLabel: 'test',
  definition,
  pollIntervalMs: { max: 4, min: 1 },
  token: 'sid-123',
};

describe('startDevConnect', () => {
  it('registers, executes a queued job, responds and reports events', async () => {
    let served = false;
    const backend = fakeBackend({
      poll: () => {
        if (served) {
          return null;
        }

        served = true;

        return { actor: { kind: 'chat', role: 'owner', spaceCodes: [], userId: 'u' }, arguments: { message: 'hi' }, id: 'job-1', name: 'ping' };
      },
    });
    const events: DevConnectEvent[] = [];
    const handle = startDevConnect({
      ...options,
      fetch: backend.fetchImpl,
      onEvent: (event) => {
        events.push(event);

        if (event.type === 'job-done') {
          handle.stop();
        }
      },
    });

    await handle.done;

    const [hello, poll, respond] = backend.calls;
    assert.equal(hello!.path, '/tools/dev-connect/hello');
    assert.equal(hello!.token, 'sid-123');
    assert.deepEqual((hello!.body as { tools: { name: string }[] }).tools.map((tool) => tool.name), ['ping']);
    assert.equal(poll!.path, '/tools/dev-connect/poll');
    assert.equal(respond!.path, '/tools/dev-connect/respond');
    assert.deepEqual(respond!.body, { jobId: 'job-1', result: { echo: 'hi' } });
    assert.deepEqual(
      events.map((event) => event.type),
      ['connected', 'manifest-sent', 'job-start', 'job-done', 'stopped']
    );
    assert.deepEqual(events[1], { type: 'manifest-sent', warnings: ['skill skipped'] });
  });

  it('reports tool failures to the backend and keeps running', async () => {
    let served = false;
    const backend = fakeBackend({
      poll: () => {
        if (served) {
          return null;
        }

        served = true;

        return { actor: { kind: 'chat', role: 'owner', spaceCodes: [], userId: 'u' }, arguments: { message: 7 }, id: 'job-2', name: 'ping' };
      },
    });
    const handle = startDevConnect({
      ...options,
      fetch: backend.fetchImpl,
      onEvent: (event) => {
        if (event.type === 'job-error') {
          assert.match(event.error, /expected string/i);
          handle.stop();
        }
      },
    });

    await handle.done;

    const respond = backend.calls.find((call) => call.path.endsWith('/respond'));
    assert.equal(typeof (respond!.body as { error: string }).error, 'string');
  });

  it('stops when the backend refuses the session', async () => {
    const backend = fakeBackend({ hello: () => Response.json({ error: 'Forbidden' }, { status: 403 }), poll: () => null });
    const events: DevConnectEvent[] = [];
    const handle = startDevConnect({ ...options, fetch: backend.fetchImpl, onEvent: (event) => events.push(event) });

    await handle.done;

    assert.deepEqual(events.map((event) => event.type), ['denied', 'stopped']);
    assert.equal((events[0] as { status: number }).status, 403);
    assert.equal(backend.calls.length, 1);
  });

  it('re-advertises the catalog after update() and survives network errors', async () => {
    let failures = 0;
    const backend = fakeBackend({ poll: () => null });
    const flaky: typeof fetch = async (input, init) => {
      if (failures < 1) {
        failures += 1;
        throw new Error('ECONNREFUSED');
      }

      return backend.fetchImpl(input, init);
    };
    const events: DevConnectEvent[] = [];
    const handle = startDevConnect({ ...options, fetch: flaky, onEvent: (event) => events.push(event) });

    await new Promise((resolve) => setTimeout(resolve, 20));
    handle.update(defineTools({ tools: [] }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    handle.stop();
    await handle.done;

    const hellos = backend.calls.filter((call) => call.path.endsWith('/hello'));
    assert.equal(hellos.length, 2, 'one hello per distinct manifest');
    assert.deepEqual((hellos[1]!.body as { tools: unknown[] }).tools, []);
    assert.equal(events.some((event) => event.type === 'unreachable'), true);
  });
});
