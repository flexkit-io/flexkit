<div align="center">
  <a href="https://flexkit.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://flexkit.io/public/logos/icon-dark-background.png">
      <img alt="Flexkit logo" src="https://flexkit.io/public/logos/icon-light-background.png" height="128">
    </picture>
  </a>
  <h1>Flexkit Explorer</h1>

<a href="https://www.npmjs.com/package/@flexkit/explorer"><img alt="NPM version" src="https://img.shields.io/npm/v/%40flexkit%2Fexplorer?style=for-the-badge&labelColor=%23000000&color=%232563eb"></a>
<a href="https://github.com/flexkit-io/flexkit/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/npm/l/%40flexkit%2Fexplorer?style=for-the-badge&labelColor=%23000000&color=%230ccf6a"></a>
<a href="https://github.com/orgs/flexkit-io/discussions"><img alt="Join the community on GitHub" src="https://img.shields.io/badge/Join%20the%20comunity-blue.svg?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgNDggNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcgOEg0MVY0MEg3VjhaIiBmaWxsPSIjMDIwODE3Ij48L3BhdGg+PHBhdGggZD0iTTI0IDBDNDIgMCA0OCA2IDQ4IDI0QzQ4IDQyIDQyIDQ4IDI0IDQ4QzYgNDggMCA0MiAwIDI0QzAgNiA2IDAgMjQgMFpNMTcuNzQ5NCA5LjUyMzgxSDguNzYxOUwxOS4yODMzIDIzLjgzMTNMOC43NjE5IDM4LjcwNzhIMTcuNzQ5NEwyMS4wNDk5IDMzLjY2MzlWMTQuMjU0OUwxNy43NDk0IDkuNTIzODFaTTM4Ljk1NzcgOS41MjM4MUgyOS45NTQyTDI2LjI4NTcgMTQuODIyOVYzMy4wNDA2TDI5Ljk1NDIgMzguNzA3OEgzOC45NTc3TDI4LjM5MDggMjMuODMxM0wzOC45NTc3IDkuNTIzODFaIiBmaWxsPSJ3aGl0ZSI+PC9wYXRoPjwvc3ZnPg==&labelColor=%23000000"></a>

</div>

**Explorer is a plugin for Flexkit Studio that provides a graphical interactive in-browser GraphQL IDE where you can explore and test the GraphQL API of your Flexkit project.**

## Features

- Full language support of the latest
  [GraphQL Specification](https://spec.graphql.org/draft/#sec-Language):
- Syntax highlighting
- Intelligent type ahead of fields, arguments, types, and more
- Real-time error highlighting and reporting for queries and variables
- Automatic query and variables completion
- Automatic leaf node insertion for non-scalar fields
- Documentation explorer with search and markdown support
- Persisted state using `localStorage`

![Screenshot](assets/screenshot.png)

## Installation

```shell
npm install @flexkit/explorer
```

### Configuring

```ts
// `flexkit.config.ts`:
import { defineConfig } from '@flexkit/studio/ssr';
import { Explorer } from '@flexkit/explorer';

export default defineConfig({
  plugins: [Explorer()],
});
```

## Contributing

Contributions to Flexkit are welcome and highly appreciated. However, before you jump right into it, we would like you to review our [Contribution Guidelines](/contributing.md) to make sure you have a smooth experience contributing to Flexkit.

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

Please email us at security@flexkit.io to report any security vulnerabilities.
