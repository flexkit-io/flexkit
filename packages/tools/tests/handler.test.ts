import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { z } from 'zod';
import { createSignedHeaders } from '../src/hmac';
import { createToolsHandler, defineSkill, defineTool, defineTools } from '../src/index';

const definition = defineTools({
  skills: [defineSkill({ name: 'Forecast', description: 'Forecast sales.', content: 'Do the forecast.' })],
  tools: [
    defineTool({
      name: 'ping',
      description: 'Echo a message.',
      input: z.object({ message: z.string().min(1) }),
      execute: ({ message }, actor) => ({ actor: actor.kind, echo: message }),
    }),
    defineTool({
      name: 'explode',
      description: 'Always fails.',
      input: z.object({}),
      execute: () => {
        throw new Error('boom');
      },
    }),
  ],
});

const url = 'https://app.example.com/api/flexkit/tools';
const chat = { kind: 'chat', role: 'owner', spaceCodes: [], userId: 'u1' };

async function signedRequest(method: 'GET' | 'POST', body?: unknown, secret = 's3cret'): Promise<Request> {
  const text = body === undefined ? '' : JSON.stringify(body);
  const headers = await createSignedHeaders({ body: text, method, path: '/api/flexkit/tools', secret });

  return new Request(url, { body: method === 'GET' ? undefined : text, headers, method });
}

afterEach(() => {
  delete process.env.FLEXKIT_TOOLS_SECRET;
});

describe('createToolsHandler', () => {
  it('refuses to serve without a secret', async () => {
    const response = await createToolsHandler(definition)(await signedRequest('GET'));

    assert.equal(response.status, 503);
  });

  it('serves the signed catalog including skills and eager input schemas', async () => {
    const handler = createToolsHandler(definition, { secret: 's3cret' });
    const response = await handler(await signedRequest('GET'));

    assert.equal(response.status, 200);
    const catalog = (await response.json()) as { skills: unknown[]; tools: { inputSchema: { [key: string]: unknown }; name: string }[] };
    assert.deepEqual(
      catalog.tools.map((tool) => tool.name),
      ['ping', 'explode']
    );
    assert.equal(catalog.tools[0]!.inputSchema.type, 'object');
    assert.equal('$schema' in catalog.tools[0]!.inputSchema, false);
    assert.equal(catalog.skills.length, 1);
  });

  it('reads the secret from the environment and rejects bad signatures', async () => {
    process.env.FLEXKIT_TOOLS_SECRET = 'env-secret';
    const handler = createToolsHandler(definition);

    assert.equal((await handler(await signedRequest('GET', undefined, 'env-secret'))).status, 200);
    assert.equal((await handler(await signedRequest('GET', undefined, 'wrong'))).status, 401);
    assert.equal((await handler(new Request(url))).status, 401);
  });

  it('executes a tool with validated arguments and the actor', async () => {
    const handler = createToolsHandler(definition, { secret: 's3cret' });
    const response = await handler(await signedRequest('POST', { actor: chat, arguments: { message: 'hi' }, name: 'ping' }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { result: { actor: 'chat', echo: 'hi' } });
  });

  it('maps bad input, unknown tools, invalid actors and execution errors', async () => {
    const handler = createToolsHandler(definition, { secret: 's3cret' });
    const post = (body: unknown) => signedRequest('POST', body).then(handler);

    const invalid = await post({ actor: chat, arguments: { message: '' }, name: 'ping' });
    assert.equal(invalid.status, 400);
    assert.equal(((await invalid.json()) as { issues: string[] }).issues.length, 1);
    assert.equal((await post({ actor: chat, arguments: {}, name: 'nope' })).status, 404);
    assert.equal((await post({ actor: { kind: 'nobody' }, arguments: {}, name: 'ping' })).status, 400);
    assert.equal((await post({ actor: chat, arguments: {}, name: 'explode' })).status, 500);

    const headers = await createSignedHeaders({ body: '', method: 'PUT', path: '/api/flexkit/tools', secret: 's3cret' });
    assert.equal((await handler(new Request(url, { headers, method: 'PUT' }))).status, 405);
  });
});
