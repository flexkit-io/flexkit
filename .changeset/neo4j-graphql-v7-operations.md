---
'@flexkit/studio': minor
'@flexkit/asset-manager': minor
'@flexkit/desk': minor
---

Generate GraphQL operations compatible with Neo4j GraphQL Library v7: pagination and sorting moved from the `options` argument to top-level `limit`/`offset`/`sort` arguments, counts read from `xConnection { aggregate { count { nodes } } }` instead of the removed `*Aggregate` fields, filters use the dedicated input syntax (`{ eq }`, `{ in }`, `{ some }`, `{ none }`), update mutations wrap values in the explicit `{ set: ... }` operator, and reordering an ordered asset gallery updates the existing relationship edge instead of reconnecting it (which would duplicate the relationship in v7).
