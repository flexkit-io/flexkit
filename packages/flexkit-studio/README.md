<div align="center">
  <a href="https://flexkit.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://flexkit.io/public/logos/icon-dark-background.png">
      <img alt="Flexkit logo" src="https://flexkit.io/public/logos/icon-light-background.png" height="128">
    </picture>
  </a>
  <h1>Flexkit</h1>

<a href="https://www.npmjs.com/package/@flexkit/studio"><img alt="NPM version" src="https://img.shields.io/npm/v/%40flexkit%2Fstudio?style=for-the-badge&labelColor=%23000000&color=%232563eb"></a>
<a href="https://github.com/flexkit-io/flexkit/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/npm/l/%40flexkit%2Fstudio?style=for-the-badge&labelColor=%23000000&color=%230ccf6a"></a>
<a href="https://github.com/orgs/flexkit-io/discussions"><img alt="Join the community on GitHub" src="https://img.shields.io/badge/Join%20the%20comunity-blue.svg?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgNDggNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcgOEg0MVY0MEg3VjhaIiBmaWxsPSIjMDIwODE3Ij48L3BhdGg+PHBhdGggZD0iTTI0IDBDNDIgMCA0OCA2IDQ4IDI0QzQ4IDQyIDQyIDQ4IDI0IDQ4QzYgNDggMCA0MiAwIDI0QzAgNiA2IDAgMjQgMFpNMTcuNzQ5NCA5LjUyMzgxSDguNzYxOUwxOS4yODMzIDIzLjgzMTNMOC43NjE5IDM4LjcwNzhIMTcuNzQ5NEwyMS4wNDk5IDMzLjY2MzlWMTQuMjU0OUwxNy43NDk0IDkuNTIzODFaTTM4Ljk1NzcgOS41MjM4MUgyOS45NTQyTDI2LjI4NTcgMTQuODIyOVYzMy4wNDA2TDI5Ljk1NDIgMzguNzA3OEgzOC45NTc3TDI4LjM5MDggMjMuODMxM0wzOC45NTc3IDkuNTIzODFaIiBmaWxsPSJ3aGl0ZSI+PC9wYXRoPjwvc3ZnPg==&labelColor=%23000000"></a>

</div>

**The open-source React platform for building internal tools, PIMs, CRMs, ERPs, and custom business data apps - fast.**

⸻

Flexkit is a schema-driven, developer-first platform for modeling and managing structured business data.
Define your data model once, sync it, and instantly get a fully-featured admin UI, a GraphQL API on top of a graph database, and a modern Studio where teams can create, explore, and relate business entities with ease.

Build production-ready internal tools, PIMs, CRMs, and complex admin interfaces in a fraction of the time — without sacrificing flexibility or developer control.

## Getting Started

Visit [https://flexkit.io/docs](https://flexkit.io/docs) to view the full documentation.

### Define your schema

`flexkit.config.ts` is pure data: no React, no JSX. Icons are [Lucide](https://lucide.dev) icon names in PascalCase and validation is a function that receives Zod.

```ts
// flexkit.config.ts
import { defineConfig, defineEntity } from '@flexkit/schema';

const products = defineEntity({
  name: 'product',
  plural: 'products',
  display: 'name',
  menu: { label: 'Products', group: 'catalog', icon: 'Tag' },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'local',
      dataType: 'string',
      inputType: 'text',
      searchable: true,
      validation: (z) => z.string().min(1, { error: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'stock',
      label: 'Stock',
      scope: 'global',
      dataType: 'int',
      inputType: 'number',
      validation: (z) => z.number().int().min(0),
      defaultValue: 0,
    },
  ],
});

export default defineConfig({
  projectId: 'your-project-id',
  title: 'Atlas Commerce',
  menuGroups: [{ name: 'catalog', title: 'Catalog' }],
  scopes: [{ name: 'default', label: 'Default', isDefault: true }],
  spaces: [{ code: 'mkt', label: 'Marketing' }],
  schema: [products],
});
```

### Mount the Studio

The Studio renders the deployed schema; run `flexkit deploy` after editing `flexkit.config.ts`. The host app never imports the config, it only passes the project ids:

```tsx
import { FlexkitStudio } from '@flexkit/studio';
import '@flexkit/studio/styles.css';

export default function Studio() {
  return <FlexkitStudio projectIds={['your-project-id']} basename="/studio" />;
}
```

`basename` is the path the Studio is mounted under; omit it when the Studio lives at `/`.

### Add custom tools (optional)

Tools and code skills let the Flexkit agent call your own server-side code. Define them in `flexkit.tools.ts` with `@flexkit/tools`, serve them from any HTTPS route with `createToolsHandler`, and run `flexkit dev` while developing. See the [custom tools guide](https://flexkit.io/docs/automations/custom-tools).

```ts
import { defineTool, defineTools } from '@flexkit/tools';
import { z } from 'zod';

export default defineTools({
  tools: [
    defineTool({
      name: 'ping',
      description: 'Echo a message from the app runtime.',
      input: z.object({ message: z.string() }),
      execute: async ({ message }) => ({ echo: message }),
    }),
  ],
});
```

## Contributing

Contributions to Flexkit are welcome and highly appreciated. However, before you jump right into it, we would like you to review our [Contribution Guidelines](/CONTRIBUTING.md) to make sure you have a smooth experience contributing to Flexkit.

## Reporting Issues

Found a bug? Have a feature request?

Open an issue with:
• Repro steps
• Expected vs actual behavior
• Screenshots when helpful
• Schema snippet (if relevant)

## License

This project is licensed under the **MIT license**.

See [LICENSE](https://github.com/flexkit-io/flexkit/blob/main/LICENSE) for more information.

---

## Security

If you believe you have found a security vulnerability in Flexkit, we encourage you to **_responsibly disclose this and NOT open a public issue_**.

See [SECURITY.md](/SECURITY.md) for how to report.
