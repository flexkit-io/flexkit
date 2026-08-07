---
'@flexkit/studio': patch
'@flexkit/asset-manager': patch
---

GraphQL query performance: asset connections are now bounded (`first: 3` in list grids, `first: 25` in forms, server-sorted by `sortOrder`) instead of expanding every connected asset per row, nested relationship selections are capped at the 3 items grids actually preview, base64 `lqip` placeholders are no longer fetched for related-entity assets, the relationship picker uses the lightweight `list` selection, pagination pages skip the top-level aggregate count, and Asset Manager tag mutations refetch with the `list` selection. List grids keep accurate "+N" asset badges via the connection aggregate count.
