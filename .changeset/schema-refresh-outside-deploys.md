---
'@flexkit/studio': patch
---

Studio now picks up schema changes deployed outside the current tab (the agent, the CLI). The listing's reload button refetches the project schema before reloading the rows, and the schema is refetched when you return to the tab, at most every 15 seconds. A failed refetch keeps the schema that already loaded.
