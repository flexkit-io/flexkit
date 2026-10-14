---
'@flexkit/studio': minor
---

Hosted mode. `projectIds` is now optional on `<FlexkitStudio />`: without it the Studio signs the user in once (no project to pick on the login screen), lists every project the account can access across its teams, opens the one used last on this browser, and switches projects from the navbar, grouped by team. Schemas are fetched per visited project. `useConfig()` exposes `mode` and `projectSummaries`. The framework adapters proxy the reserved `/api/flexkit/-/…` segment to the user-level Flexkit API with the session as a bearer token. Passing `projectIds` keeps today's behaviour.
