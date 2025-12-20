<div align="center">
  <a href="https://flexkit.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://flexkit.io/public/logos/icon-dark-background.png">
      <img alt="Flexkit logo" src="https://flexkit.io/public/logos/icon-light-background.png" height="128">
    </picture>
  </a>
  <h1>Flexkit Asset Manager</h1>

<a href="https://www.npmjs.com/package/@flexkit/asset-manager"><img alt="NPM version" src="https://img.shields.io/npm/v/%40flexkit%2Fasset-manager?style=for-the-badge&labelColor=%23000000&color=%232563eb"></a>
<a href="https://github.com/flexkit-io/flexkit/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/npm/l/%40flexkit%2Fasset-manager?style=for-the-badge&labelColor=%23000000&color=%230ccf6a"></a>
<a href="https://github.com/orgs/flexkit-io/discussions"><img alt="Join the community on GitHub" src="https://img.shields.io/badge/Join%20the%20comunity-blue.svg?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgNDggNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcgOEg0MVY0MEg3VjhaIiBmaWxsPSIjMDIwODE3Ij48L3BhdGg+PHBhdGggZD0iTTI0IDBDNDIgMCA0OCA2IDQ4IDI0QzQ4IDQyIDQyIDQ4IDI0IDQ4QzYgNDggMCA0MiAwIDI0QzAgNiA2IDAgMjQgMFpNMTcuNzQ5NCA5LjUyMzgxSDguNzYxOUwxOS4yODMzIDIzLjgzMTNMOC43NjE5IDM4LjcwNzhIMTcuNzQ5NEwyMS4wNDk5IDMzLjY2MzlWMTQuMjU0OUwxNy43NDk0IDkuNTIzODFaTTM4Ljk1NzcgOS41MjM4MUgyOS45NTQyTDI2LjI4NTcgMTQuODIyOVYzMy4wNDA2TDI5Ljk1NDIgMzguNzA3OEgzOC45NTc3TDI4LjM5MDggMjMuODMxM0wzOC45NTc3IDkuNTIzODFaIiBmaWxsPSJ3aGl0ZSI+PC9wYXRoPjwvc3ZnPg==&labelColor=%23000000"></a>

</div>

**Flexkit Asset Manager is a Studio plugin that provides a first-class interface for managing digital assets such as images, documents, PDFs, and other files within your Flexkit projects.**

It allows users to upload, browse, organize, and relate assets to entities defined in their schema, making assets a natural part of the same graph-based data model used for business data.

The Asset Manager integrates seamlessly with the Flexkit Studio and GraphQL API, enabling assets to be queried, related, and managed just like any other entity. It is designed to be extensible and customizable, so teams can adapt asset workflows, metadata, and UI components to the needs of their product.

![Screenshot](assets/screenshot.png)

## Installation

```shell
npm install @flexkit/asset-manager
```

### Configuring

```ts
// `flexkit.config.ts`:
import { defineConfig } from '@flexkit/studio';
import { AssetManager } from '@flexkit/asset-manager';

export default defineConfig({
  plugins: [AssetManager()],
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
