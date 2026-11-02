---
'@flexkit/studio': patch
---

Studio now picks up schema changes deployed outside the current tab (the agent, the CLI). The listing's reload button refetches the project schema, and the schema is refetched when you return to the tab, at most once a minute. A temporary network failure during a refetch keeps the schema that already loaded.
