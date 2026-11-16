# @flexkit/tools

## 0.1.1

### Patch Changes

- 4c0e18d: The actor a tool handler receives now says when it is called by a personal automation: `actor.visibility` is `'personal'` and `actor.creatorId` is the member the automation belongs to. A personal automation runs with that member's access, so its `spaceCodes` are that member's spaces. Both fields are absent for project and space automations, and with a backend that does not report them, so existing handlers keep working unchanged.

## 0.1.0

### Minor Changes

- af083bf: New package. Custom tools and code skills move out of `@flexkit/studio/tools` into a server-only package with no React dependency: `defineTool`, `defineSkill`, `defineTools` (the default export of `flexkit.tools.ts`), `createToolsHandler` / `handleToolsRequest` (a standard `Request → Response` handler for the signed Flexkit contract), and `@flexkit/tools/dev` with `startDevConnect`, the local runtime behind `flexkit dev`. `defineTool` now computes the catalog JSON Schema eagerly with the same `zod` that built the input schema.
