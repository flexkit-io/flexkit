import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  credentialFormComplete,
  credentialFormError,
  credentialFormFields,
  findPastedPluginToken,
  pluginSecretFormats,
} from '../../src/apps/ai/plugin-token-format';
import type { PluginCredentialsConnect } from '../../src/apps/ai/plugin-types';

const connect: PluginCredentialsConnect = {
  type: 'credentials',
  provider: 'shopify',
  description: 'Create an app.',
  helpUrl: 'https://shopify.dev/docs',
  fields: [
    { key: 'shop', label: 'Store domain', kind: 'text', placeholder: null, help: null, pattern: null, detect: null, required: true },
  ],
  methods: [
    {
      key: 'client',
      label: 'Dev Dashboard app',
      description: null,
      fields: [
        { key: 'clientId', label: 'Client ID', kind: 'text', placeholder: null, help: null, pattern: '^[A-Za-z0-9_-]{8,}$', detect: null, required: true },
        {
          key: 'clientSecret',
          label: 'Client secret',
          kind: 'secret',
          placeholder: null,
          help: null,
          pattern: '^(?:shpss_[A-Fa-f0-9]{32}|[A-Fa-f0-9]{32,64})$',
          detect: '^shpss_[A-Fa-f0-9]{32}$',
          required: true,
        },
      ],
    },
    {
      key: 'token',
      label: 'Legacy custom app',
      description: null,
      fields: [
        {
          key: 'accessToken',
          label: 'Admin API access token',
          kind: 'secret',
          placeholder: 'shpat_…',
          help: null,
          pattern: '^shpat_[A-Fa-f0-9]{32,64}$',
          detect: '^shpat_[A-Fa-f0-9]{32,64}$',
          required: true,
        },
      ],
    },
  ],
};
const shopify = { connect, id: 'shopify', name: 'Shopify' };
const secret = 'a'.repeat(32);

describe('credentials connect form', () => {
  it('shows the shared fields and those of the chosen method', () => {
    assert.deepEqual(
      credentialFormFields(connect, 'token').map((field) => field.key),
      ['shop', 'accessToken']
    );
    assert.deepEqual(
      credentialFormFields(connect, 'client').map((field) => field.key),
      ['shop', 'clientId', 'clientSecret']
    );
    assert.deepEqual(
      credentialFormFields(connect, null).map((field) => field.key),
      ['shop']
    );
  });

  it('reports the first missing or malformed value, by field', () => {
    const fields = credentialFormFields(connect, 'client');

    assert.deepEqual(credentialFormError(fields, {}), { field: 'shop', message: 'Enter the Store domain.' });
    assert.deepEqual(credentialFormError(fields, { shop: 'acme', clientId: 'short' }), {
      field: 'clientId',
      message: 'That is not a valid Client ID.',
    });
    assert.deepEqual(credentialFormError(fields, { shop: 'acme', clientId: 'client-id-1', clientSecret: ' ' }), {
      field: 'clientSecret',
      message: 'Enter the Client secret.',
    });
    assert.equal(credentialFormError(fields, { shop: ' acme ', clientId: 'client-id-1', clientSecret: secret }), null);
    assert.deepEqual(credentialFormError(fields, { shop: 'acme', clientId: 'client-id-1', clientSecret: 'a'.repeat(5000) }), {
      field: 'clientSecret',
      message: 'The Client secret is too long; paste only the value.',
    });
  });

  it('enables Connect once the required values are present, leaving format errors to the submit', () => {
    const fields = credentialFormFields(connect, 'client');

    assert.equal(credentialFormComplete(fields, { shop: 'acme', clientId: 'x' }), false);
    assert.equal(credentialFormComplete(fields, { shop: 'acme', clientId: 'x', clientSecret: 'bad' }), true);
    assert.notEqual(credentialFormError(fields, { shop: 'acme', clientId: 'x', clientSecret: 'bad' }), null);
  });

  it('exposes only the distinctive secret formats so a paste into chat is caught and named', () => {
    assert.deepEqual(pluginSecretFormats(shopify), [
      { label: 'Client secret', pattern: '^shpss_[A-Fa-f0-9]{32}$' },
      { label: 'Admin API access token', pattern: '^shpat_[A-Fa-f0-9]{32,64}$' },
    ]);

    const pasted = findPastedPluginToken(`my token is shpat_${secret} ok`, [shopify]);
    assert.equal(pasted?.plugin.id, 'shopify');
    assert.equal(pasted?.label, 'Admin API access token');
    assert.deepEqual(pasted?.tokens, [`shpat_${secret}`]);
    assert.equal(findPastedPluginToken(`legacy shpss_${secret}`, [shopify])?.label, 'Client secret');
    assert.equal(findPastedPluginToken('order #1001 for acme.myshopify.com', [shopify]), null);
    // A commit hash or an id is not a client secret, even though the validation pattern accepts hex.
    assert.equal(findPastedPluginToken('why did 3f2a9c1e4b7d8e0f1a2b3c4d5e6f708192a3b4c5 break the build?', [shopify]), null);
  });
});
