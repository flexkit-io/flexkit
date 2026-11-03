import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCreateBody,
  buildUpdateBody,
  defaultWebhookName,
  formatDeliveries,
  formatEntities,
  formatEvents,
  matchWebhooks,
  mergeHeaders,
  parseEvents,
  parseHeaderFlag,
  parseMethod,
  redactWebhook,
  REDACTED,
  type WebhookDto,
} from '../src/commands/webhooks/webhooks';

function webhook(overrides: Partial<WebhookDto> = {}): WebhookDto {
  return {
    id: '3f9c2a1e-8d4b-4c7a-9e2f-5b6a7c8d9e0f',
    name: 'Orders to ERP',
    description: '',
    url: 'https://erp.example.com/hooks/flexkit',
    method: 'POST',
    enabled: true,
    entities: ['Order'],
    events: ['create', 'update'],
    headers: [{ name: 'Authorization', value: 'Bearer old' }],
    hasSecret: false,
    secret: null,
    createdAt: '2026-11-01T00:00:00Z',
    createdBy: 'u',
    createdByName: 'Dana',
    updatedAt: null,
    lastTriggeredAt: null,
    deliveries: { failed: 0, successful: 0, total: 0 },
    ...overrides,
  };
}

describe('webhook flags', () => {
  it('parses events, repeated or comma separated, in a stable order', () => {
    assert.deepEqual(parseEvents(['update', 'create']), ['create', 'update']);
    assert.deepEqual(parseEvents(['delete,create']), ['create', 'delete']);
    assert.deepEqual(parseEvents(['all']), ['create', 'update', 'delete']);
    assert.throws(() => parseEvents(['created']), /Unknown event "created"/);
  });

  it('parses methods and headers', () => {
    assert.equal(parseMethod('put'), 'PUT');
    assert.throws(() => parseMethod('TRACE'), /Unknown method/);
    assert.deepEqual(parseHeaderFlag('Authorization=Bearer a=b'), { name: 'Authorization', value: 'Bearer a=b' });
    assert.deepEqual(parseHeaderFlag('X-Api-Key: k:1'), { name: 'X-Api-Key', value: 'k:1' });
    assert.deepEqual(parseHeaderFlag('X-Remove='), { name: 'X-Remove', value: '' });
    assert.throws(() => parseHeaderFlag('=value'), /Invalid --header/);
  });

  it('merges headers case-insensitively and removes with Key= or --remove-header', () => {
    const current = [
      { name: 'Authorization', value: 'Bearer old' },
      { name: 'X-Team', value: 'ops' },
    ];

    assert.deepEqual(mergeHeaders(current, [{ name: 'authorization', value: 'Bearer new' }], []), [
      { name: 'authorization', value: 'Bearer new' },
      { name: 'X-Team', value: 'ops' },
    ]);
    assert.deepEqual(mergeHeaders(current, [{ name: 'X-Team', value: '' }], ['AUTHORIZATION']), []);
    assert.throws(() => mergeHeaders([{ name: 'Authorization', value: null }], [], []), /hidden from your role/);
  });
});

describe('request bodies', () => {
  it('builds a create body with defaults', () => {
    assert.deepEqual(buildCreateBody({ url: 'https://erp.example.com/hook', entities: ['Order,Product'] }), {
      name: 'erp.example.com',
      url: 'https://erp.example.com/hook',
      enabled: true,
      events: ['create', 'update', 'delete'],
      entities: ['Order', 'Product'],
      headers: [],
    });
    assert.throws(() => buildCreateBody({}), /Pass --url/);
  });

  it('sends every create option that was passed', () => {
    const body = buildCreateBody({
      url: 'https://x.example.com',
      name: 'X',
      description: 'Sync',
      method: 'put',
      secret: 's',
      on: ['delete'],
      headers: ['X-Key=1'],
      disabled: true,
    });

    assert.deepEqual(body, {
      name: 'X',
      url: 'https://x.example.com',
      enabled: false,
      events: ['delete'],
      entities: [],
      headers: [{ name: 'X-Key', value: '1' }],
      method: 'PUT',
      description: 'Sync',
      secret: 's',
    });
  });

  it('sends only the changed fields on update', () => {
    assert.deepEqual(buildUpdateBody({ on: ['delete'], allEntities: true }, webhook()), {
      entities: [],
      events: ['delete'],
    });
    assert.deepEqual(buildUpdateBody({ headers: ['X-Team=ops'] }, webhook()), {
      headers: [
        { name: 'Authorization', value: 'Bearer old' },
        { name: 'X-Team', value: 'ops' },
      ],
    });
    assert.deepEqual(buildUpdateBody({ secret: '' }, webhook()), { secret: '' });
    assert.deepEqual(buildUpdateBody({}, webhook()), {});
    assert.throws(() => buildUpdateBody({ entities: ['Order'], allEntities: true }, webhook()), /not both/);
  });
});

describe('display and lookup', () => {
  it('formats events, entities and deliveries', () => {
    assert.equal(formatEvents(['create', 'update', 'delete']), 'all');
    assert.equal(formatEvents(['create']), 'create');
    assert.equal(formatEntities([]), 'all');
    assert.equal(formatDeliveries({ failed: 2, successful: 8, total: 10 }), '10 (2 failed)');
    assert.equal(defaultWebhookName('not a url'), 'not a url');
  });

  it('matches by id or case-insensitive name', () => {
    const hooks = [webhook(), webhook({ id: '00000000-0000-4000-8000-000000000000', name: 'Other' })];

    assert.equal(matchWebhooks(hooks, 'orders to erp').length, 1);
    assert.equal(matchWebhooks(hooks, '3F9C2A1E-8D4B-4C7A-9E2F-5B6A7C8D9E0F').length, 1);
    assert.equal(matchWebhooks(hooks, 'missing').length, 0);
  });
});

describe('redactWebhook', () => {
  const webhook = {
    headers: [
      { name: 'Authorization', value: 'Bearer abc' },
      { name: 'X-Hidden', value: null },
    ],
    hasSecret: true,
    secret: 's3cret',
  } as unknown as WebhookDto;

  it('replaces secrets and header values unless asked to show them', () => {
    const redacted = redactWebhook(webhook, false);

    assert.equal(redacted.secret, REDACTED);
    assert.deepEqual(
      redacted.headers.map((header) => header.value),
      [REDACTED, null]
    );
    assert.equal(redactWebhook(webhook, true), webhook);
  });
});
