import { defineConfig, defineExtension, type StudioExtension, type StudioContributions } from '../dist/index';

// @ts-expect-error The former Studio composition type is not exported as a compatibility alias.
import type { PluginOptions } from '../dist/index';

const contributions: StudioContributions = {};
const extension: StudioExtension = { id: 'acme.empty', contributes: contributions };
const custom = defineExtension({
  id: 'acme.custom',
  name: 'Custom',
  contributes: {},
  extensions: [extension],
  customOption: 42,
});
const option: number = custom.customOption;
void option;
defineConfig({ projectId: 'test', schema: [], extensions: [custom] });
defineConfig([{ projectId: 'test', basePath: '/studio', schema: [], extensions: [custom] }]);

// @ts-expect-error A human-readable name cannot replace the required identity.
defineExtension({ name: 'Missing identity', contributes: {} });
// @ts-expect-error Composition-only extensions must explicitly provide empty contributions.
defineExtension({ id: 'missing.contributions' });
// @ts-expect-error Nested extensions also require an identity.
defineExtension({ id: 'parent', contributes: {}, extensions: [{ name: 'child', contributes: {} }] });
