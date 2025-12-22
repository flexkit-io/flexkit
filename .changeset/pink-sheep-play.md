---
'@flexkit/asset-manager': patch
'@flexkit/explorer': patch
'@flexkit/studio': patch
'@flexkit/desk': patch
'@flexkit/cli': patch
---

Add multi-framework Flexkit API handlers (Next.js, Astro, TanStack Start)

- Add new `@flexkit/studio/tanstack-start` entrypoint with `createFlexkitTanStackHandler` and `createFlexkitFetchHandler`
- Keep `@flexkit/studio/nextjs` and `@flexkit/studio/astro` handlers aligned on the shared core request proxy behavior
- Improve React 18/19 compatibility in asset-related UI
- Asset Manager: improve toolbar search/filter behavior used for server-side querying
- CLI: minor improvements to spinner + shared promise utility
