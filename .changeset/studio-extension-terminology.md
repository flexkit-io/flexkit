---
'@flexkit/studio': patch
'@flexkit/ai': patch
'@flexkit/desk': patch
'@flexkit/asset-manager': patch
'@flexkit/explorer': patch
---

Rename the Studio composition API to extensions and update all official extension factories, examples, and package documentation.

This is a breaking API change: use `extensions` for project and nested configuration, replace the former composition type with `StudioExtension`, and supply a machine-readable `id` and required `contributes` object. The optional `name` is a display label. Export `StudioContributions` and the new `defineExtension` helper without compatibility aliases.

Add the `@flexkit/ai` README with installation, configuration, and an overview of AI workflows, custom tools, and skills.
