---
'@flexkit/studio': patch
---

Improve generated GraphQL operation safety and naming.

Names generated queries/mutations, includes \_id in create responses for cacheability, and consistently escapes dynamic string literals in generated mutation inputs.
