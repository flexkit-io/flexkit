import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketplacePlugin, PluginConnection } from '../../src/apps/ai/plugin-types';
import type { TemplateSummary } from '../../src/apps/ai/template-types';
import {
  groupTemplates,
  isTemplateReady,
  matchesTemplateSearch,
  missingRequiredPlugins,
  suggestedAutomationTemplates,
  templateSetupPrompt,
} from '../../src/apps/ai/template-utils';

const connected: PluginConnection = {
  accountName: 'team',
  createdAt: '2026-11-01T00:00:00Z',
  createdBy: 'u',
  displayName: 'team',
  externalAccountId: 'x',
  id: 'c1',
  isPrimary: true,
  label: null,
  pluginId: 'slack',
  scope: 'project',
  status: 'connected',
  updatedAt: '2026-11-01T00:00:00Z',
};

function plugin(id: string, connections: PluginConnection[] = []): MarketplacePlugin {
  return {
    allowPersonal: true,
    capabilities: { agentTools: true, automationDelivery: false },
    category: 'communication',
    connections,
    description: '',
    enabled: true,
    id,
    installed: connections.length > 0,
    logoUrl: '',
    name: id.charAt(0).toUpperCase() + id.slice(1),
    preview: false,
    scopes: ['project'],
    sourceUrl: '',
    updateMode: 'auto',
    updatedAt: '',
    usedBy: [],
    version: '1.0.0',
    versionId: 'v',
  };
}

function template(overrides: Partial<TemplateSummary> & Pick<TemplateSummary, 'name'>): TemplateSummary {
  return {
    category: 'catalog',
    data: [],
    description: '',
    displayName: overrides.name,
    howItWorks: [],
    kind: 'automation',
    parameters: [],
    plugins: [],
    usedBy: 0,
    version: '1.0.0',
    ...overrides,
  };
}

const slackConnected = plugin('slack', [connected]);
const resendMissing = plugin('resend');
const shopifyMissing = plugin('shopify');
const plugins = [slackConnected, resendMissing, shopifyMissing];

describe('template readiness', () => {
  it('is ready when every required plugin is connected, whatever the optional ones', () => {
    const lowStock = template({
      name: 'low-stock-alert',
      plugins: [
        { id: 'slack', reason: '', required: true },
        { id: 'resend', reason: '', required: false },
      ],
    });

    assert.equal(isTemplateReady(lowStock, plugins), true);
    assert.deepEqual(missingRequiredPlugins(lowStock, plugins), []);
  });

  it('lists the required plugins still to connect, in the template order', () => {
    const intake = template({
      name: 'order-webhook-intake',
      plugins: [
        { id: 'shopify', reason: '', required: true },
        { id: 'slack', reason: '', required: true },
        { id: 'resend', reason: '', required: true },
      ],
    });

    assert.equal(isTemplateReady(intake, plugins), false);
    assert.deepEqual(
      missingRequiredPlugins(intake, plugins).map((item) => item.id),
      ['shopify', 'resend']
    );
  });

  it('treats a required plugin missing from the catalog as not ready', () => {
    const unknown = template({ name: 'x', plugins: [{ id: 'gone', reason: '', required: true }] });

    assert.equal(isTemplateReady(unknown, plugins), false);
  });

  it('is ready with no plugins at all', () => {
    assert.equal(isTemplateReady(template({ name: 'writer' }), plugins), true);
  });
});

describe('groupTemplates', () => {
  it('groups every template by category, in alphabetical order', () => {
    const writer = template({ category: 'catalog', name: 'writer' });
    const intake = template({ category: 'orders-customers', name: 'intake' });
    const voice = template({ category: 'marketing', kind: 'skill', name: 'brand-voice' });
    const guide = template({ category: 'catalog', kind: 'skill', name: 'guide' });

    assert.deepEqual(
      groupTemplates([writer, intake, voice, guide]).map((group) => [
        group.category,
        group.templates.map((item) => item.name),
      ]),
      [
        ['catalog', ['writer', 'guide']],
        ['marketing', ['brand-voice']],
        ['orders-customers', ['intake']],
      ]
    );
  });
});

describe('matchesTemplateSearch', () => {
  const lowStock = template({
    description: 'Warns before a SKU runs out',
    displayName: 'Low-stock alert',
    keywords: ['inventory'],
    name: 'low-stock-alert',
  });

  it('matches name, description and keywords, ignoring case and spaces around', () => {
    assert.equal(matchesTemplateSearch(lowStock, '  LOW-stock '), true);
    assert.equal(matchesTemplateSearch(lowStock, 'sku'), true);
    assert.equal(matchesTemplateSearch(lowStock, 'inventory'), true);
    assert.equal(matchesTemplateSearch(lowStock, 'refund'), false);
    assert.equal(matchesTemplateSearch(lowStock, ''), true);
  });
});

describe('suggestedAutomationTemplates', () => {
  it('suggests ready automations first, skips skills and caps the list', () => {
    const intake = template({ name: 'intake', plugins: [{ id: 'shopify', reason: '', required: true }] });
    const digest = template({ name: 'digest', plugins: [{ id: 'slack', reason: '', required: true }] });
    const voice = template({ kind: 'skill', name: 'brand-voice' });
    const writer = template({ name: 'writer' });

    assert.deepEqual(
      suggestedAutomationTemplates([intake, voice, digest, writer], plugins, 2).map((item) => item.name),
      ['digest', 'writer']
    );
  });
});

describe('templateSetupPrompt', () => {
  it('names the template so the agent can load it', () => {
    assert.equal(
      templateSetupPrompt({ displayName: 'Low-stock alert', name: 'low-stock-alert' }),
      'Set up the "Low-stock alert" template (low-stock-alert).'
    );
  });
});
