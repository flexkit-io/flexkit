# @flexkit/asset-manager

## 0.0.30

### Patch Changes

- Updated dependencies [306e794]
  - @flexkit/studio@0.0.30

## 0.0.29

### Patch Changes

- 1c89ae9: GraphQL query performance: asset connections are now bounded (`first: 3` in list grids, `first: 25` in forms, server-sorted by `sortOrder`) instead of expanding every connected asset per row, nested relationship selections are capped at the 3 items grids actually preview, base64 `lqip` placeholders are no longer fetched for related-entity assets, the relationship picker uses the lightweight `list` selection, pagination pages skip the top-level aggregate count, and Asset Manager tag mutations refetch with the `list` selection. List grids keep accurate "+N" asset badges via the connection aggregate count. Entity edit forms with more than 25 linked assets can load additional pages in the asset-multiple field without treating paged-in edges as new connects.
- Updated dependencies [1c89ae9]
- Updated dependencies [68e0fec]
- Updated dependencies [ca6fb4b]
  - @flexkit/studio@0.0.29

## 0.0.28

### Patch Changes

- Updated dependencies [da1860f]
  - @flexkit/studio@0.0.28

## 0.0.27

### Patch Changes

- d68ec49: Add a CLI asset import/export pipeline and migrate uploads to the one-shot assets endpoint.
  - CLI: new `flexkit assets upload` (files, directories, URLs, `--id-from`, `--tag`, `--json`), `flexkit import` (NDJSON/directory/tarball with `_asset` and `_ref` references, `--dry-run`, `--skip-existing`/`--replace`) and `flexkit export` / `flexkit assets export` (round-trippable tarballs with `data.ndjson`, `assets.ndjson` and files).
  - Studio: uploads now go through the single `POST /assets` endpoint which stores the blob and creates the asset node (deduplicated by content hash) in one request; entity saves connect assets by `_id` instead of nested create/update.
  - Asset Manager: per-row actions with Copy ID and Copy URL.

- ed0a3bd: Add per-column ascending and descending sort menus on entity data tables, with a clearable Sorted by toolbar control.
- 02d8b47: Keep DataTable headers sticky on vertical scroll, and show skeletons while asset search is loading.
- Updated dependencies [d68ec49]
- Updated dependencies [ed0a3bd]
- Updated dependencies [c64d273]
- Updated dependencies [02d8b47]
- Updated dependencies [438a6c8]
  - @flexkit/studio@0.0.27

## 0.0.26

### Patch Changes

- ad393a8: Generate GraphQL operations compatible with Neo4j GraphQL Library v7: pagination and sorting moved from the `options` argument to top-level `limit`/`offset`/`sort` arguments, counts read from `xConnection { aggregate { count { nodes } } }` instead of the removed `*Aggregate` fields, filters use the dedicated input syntax (`{ eq }`, `{ in }`, `{ some }`, `{ none }`), update mutations wrap values in the explicit `{ set: ... }` operator, and reordering an ordered asset gallery updates the existing relationship edge instead of reconnecting it (which would duplicate the relationship in v7).
- Updated dependencies [6738fbf]
- Updated dependencies [ad393a8]
- Updated dependencies [9de8878]
  - @flexkit/studio@0.0.26

## 0.0.25

### Patch Changes

- @flexkit/studio@0.0.25

## 0.0.24

### Patch Changes

- Updated dependencies [797d389]
  - @flexkit/studio@0.0.24

## 0.0.23

### Patch Changes

- Updated dependencies [0fc1627]
  - @flexkit/studio@0.0.23

## 0.0.22

### Patch Changes

- Updated dependencies [6f104b5]
  - @flexkit/studio@0.0.22

## 0.0.21

### Patch Changes

- Updated dependencies [9563bc9]
  - @flexkit/studio@0.0.21

## 0.0.20

### Patch Changes

- cc75129: Upgrade to React 19
- Updated dependencies [cc75129]
  - @flexkit/studio@0.0.20

## 0.0.19

### Patch Changes

- 28516ff: Adds support for ordered multi-asset relationship fields backed by `_asset` relationships. Studio now includes an asset-specific picker, multi-file upload, thumbnail previews, manual ordering via relationship edge `sortOrder`, optimized save mutations, and clearer GraphQL schema mismatch errors.
- Updated dependencies [26cf0e3]
- Updated dependencies [28516ff]
  - @flexkit/studio@0.0.19

## 0.0.18

### Patch Changes

- Updated dependencies [943fb28]
  - @flexkit/studio@0.0.18

## 0.0.17

### Patch Changes

- Updated dependencies [7da8d4c]
  - @flexkit/studio@0.0.17

## 0.0.16

### Patch Changes

- Updated dependencies [c727184]
- Updated dependencies [eb01a1a]
- Updated dependencies [92faeda]
- Updated dependencies [c344bf9]
- Updated dependencies [1b1ab0d]
- Updated dependencies [7706f86]
  - @flexkit/studio@0.0.16

## 0.0.15

### Patch Changes

- Updated dependencies [daffc94]
  - @flexkit/studio@0.0.15

## 0.0.14

### Patch Changes

- Updated dependencies [e03c4e4]
  - @flexkit/studio@0.0.14

## 0.0.13

### Patch Changes

- Updated dependencies [7e0b90c]
  - @flexkit/studio@0.0.13

## 0.0.12

### Patch Changes

- Updated dependencies [98eadea]
  - @flexkit/studio@0.0.12

## 0.0.11

### Patch Changes

- 3d16726: Upgrade SWR package
- Updated dependencies [3d16726]
  - @flexkit/studio@0.0.11

## 0.0.10

### Patch Changes

- 3d56ae9: Upgrade dependencies
- Updated dependencies [3d56ae9]
  - @flexkit/studio@0.0.10

## 0.0.9

### Patch Changes

- Updated dependencies [b2d3057]
  - @flexkit/studio@0.0.9

## 0.0.8

### Patch Changes

- cc3d3e2: - Upgrade dependencies
  - Fix API proxy to handle streaming bodies
- Updated dependencies [cc3d3e2]
  - @flexkit/studio@0.0.8

## 0.0.7

### Patch Changes

- df679c2: Add multi-framework Flexkit API handlers (Next.js, Astro, TanStack Start)
  - Add new `@flexkit/studio/tanstack-start` entrypoint with `createFlexkitTanStackHandler` and `createFlexkitFetchHandler`
  - Keep `@flexkit/studio/nextjs` and `@flexkit/studio/astro` handlers aligned on the shared core request proxy behavior
  - Improve React 18/19 compatibility in asset-related UI
  - Asset Manager: improve toolbar search/filter behavior used for server-side querying
  - CLI: minor improvements to spinner + shared promise utility
  - CLI: improve error handling for `sync` command

- Updated dependencies [df679c2]
  - @flexkit/studio@0.0.7

## 0.0.6

### Patch Changes

- Updated dependencies [937bdf3]
  - @flexkit/studio@0.0.6

## 0.0.5

### Patch Changes

- 526357c: Unbundle the Studio core from the plugins. Now each package is published separately to NPM.
- Updated dependencies [526357c]
  - @flexkit/studio@0.0.5

## 0.0.4

### Patch Changes

- @flexkit/core@0.0.4

## 0.0.3

### Patch Changes

- d2693d1: Refactor dependency bundling to include Flexkit's core and plugins
  Upgrade @apollo/client to v4.x
- Updated dependencies [d2693d1]
  - @flexkit/core@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies [3964264]
  - @flexkit/core@0.0.2
