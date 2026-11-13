---
'@flexkit/studio': patch
---

Studio no longer tells people to run `flexkit deploy` when a project or its schema cannot be loaded. Opening a project that is not in your list (deleted, a wrong link, or not shared with you) shows **Project not found** with what to do next, and a self-hosted Studio points to the project ID and the Flexkit API handler. A request that no longer matches a changed schema asks you to reload the page.
