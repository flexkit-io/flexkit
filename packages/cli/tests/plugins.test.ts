import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  credentialFieldsFor,
  defaultScope,
  filterPlugins,
  findNewConnection,
  parseStringPairs,
  pickConnection,
  pluginState,
  studioPluginUrl,
  studioOrigin,
  toolAccess,
  unknownCredentialKeys,
  validateCredential,
  type CredentialField,
  type MarketplacePlugin,
  type PluginConnect,
  type PluginConnection,
} from '../src/commands/plugins/helpers';

function connection(overrides: Partial<PluginConnection> = {}): PluginConnection {
  return {
    id: '6c2f1b0e-3d4a-4f7b-9a8e-1c2d3e4f5a6b',
    pluginId: 'gmail',
    scope: 'personal',
    accountName: 'ada@example.com',
    label: null,
    displayName: 'ada@example.com',
    isPrimary: true,
    externalAccountId: 'ext-1',
    status: 'connected',
    createdBy: 'user-1',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...overrides,
  };
}

function plugin(overrides: Partial<MarketplacePlugin> = {}): MarketplacePlugin {
  return {
    usedBy: [],
    id: 'gmail',
    name: 'Gmail',
    description: '',
    category: 'communication',
    scopes: ['project', 'personal'],
    version: '1.0.0',
    versionId: 'v1',
    updatedAt: '2026-10-01',
    preview: false,
    capabilities: { agentTools: true, automationDelivery: false },
    sourceUrl: '',
    logoUrl: '',
    enabled: true,
    allowPersonal: true,
    installed: false,
    updateMode: 'auto',
    connections: [],
    ...overrides,
  };
}

const shopify: Extract<PluginConnect, { type: 'credentials' }> = {
  type: 'credentials',
  provider: 'shopify',
  description: '',
  helpUrl: null,
  fields: [
    { key: 'shop', label: 'Store domain', kind: 'text', placeholder: null, help: null, pattern: null, required: true },
  ],
  methods: [
    {
      key: 'client',
      label: 'Dev Dashboard app',
      description: null,
      fields: [
        {
          key: 'clientId',
          label: 'Client ID',
          kind: 'text',
          placeholder: null,
          help: null,
          pattern: '^[A-Za-z0-9_-]{8,128}$',
          required: true,
        },
      ],
    },
    {
      key: 'token',
      label: 'Legacy',
      description: null,
      fields: [
        {
          key: 'accessToken',
          label: 'Token',
          kind: 'secret',
          placeholder: null,
          help: null,
          pattern: '^shpat_',
          required: true,
        },
      ],
    },
  ],
};

describe('plugins helpers', () => {
  it('filters plugins in use, available and all, sorted by name', () => {
    const plugins = [
      plugin({ id: 'slack', name: 'Slack', installed: true }),
      plugin({ id: 'gmail', name: 'Gmail', connections: [connection()] }),
      plugin({ id: 'hubspot', name: 'HubSpot' }),
    ];

    assert.deepEqual(
      filterPlugins(plugins, 'in-use').map((entry) => entry.id),
      ['gmail', 'slack']
    );
    assert.deepEqual(
      filterPlugins(plugins, 'available').map((entry) => entry.id),
      ['hubspot']
    );
    assert.equal(filterPlugins(plugins, 'all').length, 3);
  });

  it('derives a state word', () => {
    assert.equal(pluginState(plugin({ enabled: false, installed: true })), 'disabled');
    assert.equal(pluginState(plugin({ connections: [connection()] })), 'connected');
    assert.equal(pluginState(plugin({ connections: [connection({ status: 'needs_auth' })] })), 'needs_auth');
    assert.equal(pluginState(plugin({ installed: true })), 'installed');
    assert.equal(pluginState(plugin()), 'available');
  });

  it('picks the connection the agent would use', () => {
    const project = connection({ id: 'p', scope: 'project' });
    const personal = connection({ id: 'u', scope: 'personal' });
    const broken = connection({ id: 'b', status: 'needs_auth' });

    assert.deepEqual(pickConnection([project, personal]), { connection: personal });
    assert.deepEqual(pickConnection([project, broken]), { connection: project });
    assert.deepEqual(pickConnection([project, personal], 'p'), { connection: project });
    assert.ok('error' in pickConnection([project], 'missing'));
    assert.ok('error' in pickConnection([broken]));
    assert.ok('error' in pickConnection([]));
  });

  it('chooses the default connection scope from the role and policy', () => {
    assert.equal(defaultScope(plugin(), true), 'project');
    assert.equal(defaultScope(plugin(), false), 'personal');
    assert.equal(defaultScope(plugin({ allowPersonal: false }), false), null);
    assert.equal(defaultScope(plugin({ scopes: ['personal'] }), true), 'personal');
  });

  it('builds the credential field list for a method', () => {
    assert.deepEqual(
      credentialFieldsFor(shopify, 'client')?.map((field) => field.key),
      ['shop', 'clientId']
    );
    assert.equal(credentialFieldsFor(shopify, 'nope'), null);
    assert.equal(credentialFieldsFor(shopify, undefined), null);
    assert.deepEqual(credentialFieldsFor({ ...shopify, methods: [] }, undefined), shopify.fields);
  });

  it('parses --set pairs as plain strings', () => {
    assert.deepEqual(parseStringPairs(['shop=acme.myshopify.com', 'clientId=123=4', 'flag=true']), {
      shop: 'acme.myshopify.com',
      clientId: '123=4',
      flag: 'true',
    });
    assert.throws(() => parseStringPairs(['=x']), /key=value/);
    assert.deepEqual(parseStringPairs(undefined), {});
  });

  it('validates credentials and finds unknown keys', () => {
    const field = shopify.methods[0]?.fields[0] as CredentialField;

    assert.equal(validateCredential(field, 'abcdefgh12'), null);
    assert.match(validateCredential(field, 'x') ?? '', /does not look right/);
    assert.match(validateCredential(field, '') ?? '', /required/);
    assert.equal(validateCredential({ ...field, required: false }, undefined), null);
    assert.deepEqual(unknownCredentialKeys(credentialFieldsFor(shopify, 'client') ?? [], { shop: 'a', extra: 'b' }), [
      'extra',
    ]);
  });

  it('detects a new or reconnected account', () => {
    const existing = connection({ id: 'a' });

    assert.equal(findNewConnection([existing], [existing]), null);
    assert.equal(findNewConnection([existing], [existing, connection({ id: 'b' })])?.id, 'b');
    assert.equal(findNewConnection([existing], [{ ...existing, updatedAt: '2026-11-03T10:00:00Z' }])?.id, 'a');
    assert.equal(findNewConnection([{ ...existing, status: 'needs_auth' }], [existing])?.id, 'a');
    assert.equal(findNewConnection([], [connection({ id: 'c', status: 'needs_auth' })]), null);
  });

  it('builds Studio links', () => {
    assert.equal(studioOrigin({}), 'https://flexkit.app');
    assert.equal(studioOrigin({ FLEXKIT_STUDIO_URL: 'http://localhost:3003/' }), 'http://localhost:3003');
    assert.equal(
      studioPluginUrl('https://flexkit.app', 'abcdefghij', 'gmail'),
      'https://flexkit.app/abcdefghij/ai/plugins/gmail'
    );
  });

  it('labels tool access from annotations', () => {
    assert.equal(toolAccess({ name: 'a', inputSchema: {}, annotations: { readOnlyHint: true } }), 'read');
    assert.equal(toolAccess({ name: 'b', inputSchema: {}, annotations: { destructiveHint: true } }), 'destructive');
    assert.equal(toolAccess({ name: 'c', inputSchema: {} }), 'write');
  });
});
