/**
 * Type-level checks, run with `tsc --noEmit -p tests/tsconfig.json`.
 * Lines marked @ts-expect-error must fail to compile.
 */
import { defineConfig, defineEntity } from '../src/index';
import type { UiEntity } from '../src/index';

const entity = defineEntity({
  name: 'product',
  plural: 'products',
  menu: { group: 'catalog', icon: 'Tag' },
  groups: [{ name: 'main', title: 'Main', icon: 'Box', hidden: false }],
  attributes: [
    {
      name: 'name',
      label: 'Name',
      dataType: 'string',
      inputType: 'text',
      scope: 'global',
      hidden: false,
      readOnly: true,
      isRequired: true,
      validation: (z) => z.string().min(1),
    },
  ],
});

defineConfig({
  projectId: 'abcdefghij',
  title: 'Shop',
  menuGroups: [{ name: 'catalog', title: 'Catalog' }],
  schema: [entity],
});

defineConfig([
  { projectId: 'one', schema: [entity] },
  { projectId: 'two', schema: [] },
]);

defineEntity({
  name: 'product',
  plural: 'products',
  // @ts-expect-error icons are lucide names, not elements
  menu: { icon: { type: 'svg' } },
  attributes: [],
});

defineEntity({
  name: 'product',
  plural: 'products',
  attributes: [
    {
      name: 'name',
      label: 'Name',
      dataType: 'string',
      inputType: 'text',
      scope: 'global',
      // @ts-expect-error conditional flags are booleans only
      hidden: () => true,
    },
  ],
});

// `defineConfig` is generic, so excess keys such as `basePath` or `extensions`
// are not compile errors; the CLI serializer drops them at deploy time.

// The deployed shape carries JSON Schema, never functions.
const deployed: UiEntity = {
  name: 'product',
  plural: 'products',
  attributes: [
    {
      name: 'name',
      label: 'Name',
      dataType: 'string',
      inputType: 'text',
      scope: 'global',
      validation: { type: 'string', minLength: 1 },
    },
  ],
};

void deployed;
