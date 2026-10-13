---
"@flexkit/studio": minor
---

The Studio renders the schema deployed to each project instead of a bundled config. Breaking:

- Mount with `<FlexkitStudio projectIds={['abc']} basename="/studio" />`; the `config` prop is gone and `basePath` moved to the `basename` prop. The Studio fetches each project's schema from `GET /<projectId>/api/schema` after login.
- Desk, Asset Manager, Explorer and AI are built in. `@flexkit/desk`, `@flexkit/explorer`, `@flexkit/asset-manager` and `@flexkit/ai` are folded into `@flexkit/studio` (their public types are re-exported from it) and the `extensions`, `contributes`, `defineExtension`, navbar, `formFields` and `previewFields` extension points are removed.
- Icons are lucide names (`menu.icon: 'Tag'`, `groups[].icon`), rendered on demand so the icon set no longer ships in the main bundle. `hidden` / `readOnly` are booleans. Form validation runs from the deployed JSON Schema with messages generated from the attribute label.
- `defineConfig` and `defineEntity` are re-exported from `@flexkit/schema`.
