import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { describeConnectFailure, getPluginConnectState } from '../../src/apps/ai/agent/plugin-connect-state';
import type { MarketplacePlugin, PluginConnection } from '../../src/apps/ai/plugin-types';

function plugin(overrides: Partial<MarketplacePlugin> = {}): MarketplacePlugin {
  return {
    allowPersonal: true,
    capabilities: { agentTools: true, automationDelivery: false },
    category: 'productivity',
    connections: [],
    description: '',
    enabled: true,
    id: 'notion',
    installed: false,
    logoUrl: '',
    name: 'Notion',
    preview: false,
    scopes: ['project', 'personal'],
    sourceUrl: '',
    updateMode: 'auto',
    updatedAt: '',
    usedBy: [],
    version: '1.0.0',
    versionId: 'v',
    ...overrides,
  };
}

function connection(overrides: Partial<PluginConnection>): PluginConnection {
  return {
    accountName: 'dan@acme.com',
    createdAt: '2026-10-18T00:00:00Z',
    createdBy: 'u',
    displayName: 'dan@acme.com',
    externalAccountId: 'x',
    id: 'c1',
    isPrimary: true,
    label: null,
    pluginId: 'notion',
    scope: 'personal',
    status: 'connected',
    updatedAt: '2026-10-18T00:00:00Z',
    ...overrides,
  };
}

describe('getPluginConnectState', () => {
  it('offers the scopes the viewer may connect, like the Marketplace', () => {
    assert.deepEqual(getPluginConnectState(plugin(), true), { kind: 'connect', scopes: ['project', 'personal'] });
    assert.deepEqual(getPluginConnectState(plugin(), false), { kind: 'connect', scopes: ['personal'] });
    assert.deepEqual(getPluginConnectState(plugin({ allowPersonal: false }), false), { kind: 'not_permitted' });
    assert.deepEqual(getPluginConnectState(plugin({ enabled: false }), true), { kind: 'disabled' });
  });

  it('shows the account chat will use once connected, personal first', () => {
    const project = connection({ id: 'p1', scope: 'project' });
    const personal = connection({ id: 'u1', scope: 'personal' });

    assert.equal(getPluginConnectState(plugin({ connections: [project, personal] }), true).kind, 'connected');
    assert.deepEqual(getPluginConnectState(plugin({ connections: [project, personal] }), true), {
      connection: personal,
      kind: 'connected',
    });
  });

  it('reconnects the account the agent asked about, if the viewer may', () => {
    const broken = connection({ id: 'p1', scope: 'project', status: 'needs_auth' });

    assert.deepEqual(getPluginConnectState(plugin({ connections: [broken] }), true, 'p1'), {
      connection: broken,
      kind: 'reconnect',
    });
    assert.deepEqual(getPluginConnectState(plugin({ connections: [broken] }), false, 'p1'), { kind: 'not_permitted' });
    // Fixed elsewhere meanwhile: the card no longer asks.
    assert.equal(
      getPluginConnectState(plugin({ connections: [{ ...broken, status: 'connected' }] }), true, 'p1').kind,
      'connected'
    );
  });
});

describe('describeConnectFailure', () => {
  it('keeps an abandoned sign-in short and names any other reason', () => {
    assert.equal(describeConnectFailure('Stripe', 'Connection window was closed.'), "Stripe authorization didn't finish");
    assert.equal(describeConnectFailure('Stripe', ''), "Stripe authorization didn't finish");
    assert.equal(
      describeConnectFailure('Stripe', 'Origin is not allowed.'),
      "Stripe authorization didn't finish: Origin is not allowed"
    );
    assert.equal(
      describeConnectFailure('Stripe', 'Allow popups for Studio, then connect again.'),
      'Allow popups for Studio, then connect again.'
    );
  });
});

