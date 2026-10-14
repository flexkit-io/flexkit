# @flexkit/tools

## 0.1.0

### Minor Changes

- af083bf: New package. Custom tools and code skills move out of `@flexkit/studio/tools` into a server-only package with no React dependency: `defineTool`, `defineSkill`, `defineTools` (the default export of `flexkit.tools.ts`), `createToolsHandler` / `handleToolsRequest` (a standard `Request → Response` handler for the signed Flexkit contract), and `@flexkit/tools/dev` with `startDevConnect`, the local runtime behind `flexkit dev`. `defineTool` now computes the catalog JSON Schema eagerly with the same `zod` that built the input schema.
