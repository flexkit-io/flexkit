# @flexkit/schema

Types and helpers for `flexkit.config.ts`:

- `defineConfig` and `defineEntity` to author a project configuration with full typing.
- The schema types (`Entity`, `Attribute`, `ProjectConfig`, …) and their deployed counterparts (`UiEntity`, `UiAttribute`, `UiProjectSchema`).
- `serializeConfig`, used by `flexkit deploy`, which turns the config into pure data: Zod `validation` functions are compiled to JSON Schema (draft-07), and anything that cannot be expressed that way fails with a `SchemaSerializationError` naming the entity and attribute.

```ts
import { defineConfig, defineEntity } from '@flexkit/schema';

export default defineConfig({
  projectId: 'abcdefghij',
  title: 'Shop',
  menuGroups: [{ name: 'catalog', title: 'Catalog' }],
  scopes: [{ name: 'default', label: 'Default', isDefault: true }],
  schema: [
    defineEntity({
      name: 'product',
      plural: 'products',
      menu: { group: 'catalog', icon: 'Tag' },
      attributes: [
        {
          name: 'name',
          label: 'Name',
          dataType: 'string',
          inputType: 'text',
          scope: 'global',
          validation: (z) => z.string().min(1),
        },
      ],
    }),
  ],
});
```
