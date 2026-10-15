---
'@flexkit/agent-protocol': minor
'@flexkit/studio': minor
---

Schema change approvals. The Flexkit Agent can now propose schema changes on app-managed projects; approvals of `kind: 'schema'` carry a `preview.schema` summary and render a dedicated card listing the entities and attributes added, changed or removed, with breaking changes called out. After an approved schema deployment completes, the Studio refetches the project schema so the new entities appear without a reload.
