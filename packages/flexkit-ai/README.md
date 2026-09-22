<div align="center">
  <a href="https://flexkit.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://flexkit.io/public/logos/icon-dark-background.png">
      <img alt="Flexkit logo" src="https://flexkit.io/public/logos/icon-light-background.png" height="128">
    </picture>
  </a>
  <h1>Flexkit AI</h1>

<a href="https://www.npmjs.com/package/@flexkit/ai"><img alt="NPM version" src="https://img.shields.io/npm/v/%40flexkit%2Fai?style=for-the-badge&labelColor=%23000000&color=%232563eb"></a>
<a href="https://github.com/flexkit-io/flexkit/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/npm/l/%40flexkit%2Fai?style=for-the-badge&labelColor=%23000000&color=%230ccf6a"></a>
<a href="https://github.com/orgs/flexkit-io/discussions"><img alt="Join the community on GitHub" src="https://img.shields.io/badge/Join%20the%20comunity-blue.svg?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgNDggNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcgOEg0MVY0MEg3VjhaIiBmaWxsPSIjMDIwODE3Ij48L3BhdGg+PHBhdGggZD0iTTI0IDBDNDIgMCA0OCA2IDQ4IDI0QzQ4IDQyIDQyIDQ4IDI0IDQ4QzYgNDggMCA0MiAwIDI0QzAgNiA2IDAgMjQgMFpNMTcuNzQ5NCA5LjUyMzgxSDguNzYxOUwxOS4yODMzIDIzLjgzMTNMOC43NjE5IDM4LjcwNzhIMTcuNzQ5NEwyMS4wNDk5IDMzLjY2MzlWMTQuMjU0OUwxNy43NDk0IDkuNTIzODFaTTM4Ljk1NzcgOS41MjM4MUgyOS45NTQyTDI2LjI4NTcgMTQuODIyOVYzMy4wNDA2TDI5Ljk1NDIgMzguNzA3OEgzOC45NTc3TDI4LjM5MDggMjMuODMxM0wzOC45NTc3IDkuNTIzODFaIiBmaWxsPSJ3aGl0ZSI+PC9wYXRoPjwvc3ZnPg==&labelColor=%23000000"></a>

</div>

**`@flexkit/ai` is an official Flexkit Studio extension. It brings Agent Chat, automations, skills, run history, and approvals into your Studio workspace.**

**Put AI to work across your commerce business.** Flexkit is **The Agentic Operating System for E-Commerce**, bringing your data, tools, and workflows together in one workspace. Give agents the context to understand your business and the tools to act—from enriching product catalogs and preparing merchandising campaigns to handling order operations. Turn everyday requests into repeatable automations, with approvals and run history keeping your team in control.

**Expand what your agents can do with Flexkit Marketplace.** Discover and install ready-to-use skills, tools, and integrations for the way you sell, operate, and grow. Bring specialized capabilities into your workspace and build an AI workforce around your business.

**Make your agents experts in your business.** Add custom tools in code to give agents access to your business logic and workflows. Capture your team's expertise in reusable skills—define them in code to version them alongside your application, or create and manage them directly in Studio.

## Features

- Chat with an AI agent about your project data
- Create and manage automations
- Add custom tools in code to connect agents to your business logic
- Define reusable skills in code for version control, or create and manage them in Studio
- Inspect run history and individual execution details
- Review and resolve approval requests

## Installation

Install alongside `@flexkit/studio` in your existing Studio application:

```shell
npm install @flexkit/ai
```

### Configuring

Add `AI()` to your project's `extensions` array, keeping any other Studio extensions already registered:

```ts
// `flexkit.studio.tsx`:
import { defineConfig } from '@flexkit/studio';
import { AI } from '@flexkit/ai';

export default defineConfig({
  projectId: 'YOUR_PROJECT_ID',
  basePath: '/studio',
  schema: [],
  extensions: [AI()],
});
```

Replace the project ID and use your project's schema. Import the styles once through your application's stylesheet entry point:

```ts
import '@flexkit/studio/styles.css';
import '@flexkit/ai/styles.css';
```

AI execution depends on project access, model configuration, and available AI credits. Registering the extension adds the Studio interface; custom tools are configured separately in your application's server handler.

## Contributing

Contributions to Flexkit are welcome and highly appreciated. However, before you jump right into it, we would like you to review our [Contribution Guidelines](../../CONTRIBUTING.md) to make sure you have a smooth experience contributing to Flexkit.

## Reporting Issues

Found a bug? Have a feature request?

Open an issue with:

- Repro steps
- Expected vs actual behavior
- Screenshots when helpful
- Schema snippet (if relevant)

## License

This project is licensed under the **MIT license**.

See [LICENSE](https://github.com/flexkit-io/flexkit/blob/main/LICENSE) for more information.

---

## Security

If you believe you have found a security vulnerability in Flexkit, we encourage you to **_responsibly disclose this and NOT open a public issue_**.

See [SECURITY.md](../../SECURITY.md) for how to report.
