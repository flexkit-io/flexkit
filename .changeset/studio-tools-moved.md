---
'@flexkit/studio': minor
---

**Breaking:** custom tools and code skills no longer live in the Studio package. `@flexkit/studio/tools` is removed; import `defineTool`, `defineSkill` and `defineTools` from `@flexkit/tools` and serve them with `createToolsHandler` on their own route. `createFlexkitApiHandler`, `createFlexkitAstroHandler`, `createFlexkitTanStackHandler` and `createFlexkitFetchHandler` take no options any more and only handle Studio auth and the API proxy. The Studio no longer polls a local tools runtime from the page: run `flexkit dev` instead, which works with a self-hosted, hosted or desktop Studio alike.
