# @flexkit/studio

## 0.0.28

### Patch Changes

- da1860f: Upgrade Studio to Zod 4 and align form validation / demo schemas with Zod 4 APIs.
  Copyable data grid fields
  Zoomable images in Asset Manager
  Grid view in Asset Manager
  Infinite-scroll rows now keep the same height as existing ones with no brief jump
  Improved performance when adding/removing tags to assets
  Improved performance when mass deleting records

## 0.0.27

### Patch Changes

- d68ec49: Add a CLI asset import/export pipeline and migrate uploads to the one-shot assets endpoint.
  - CLI: new `flexkit assets upload` (files, directories, URLs, `--id-from`, `--tag`, `--json`), `flexkit import` (NDJSON/directory/tarball with `_asset` and `_ref` references, `--dry-run`, `--skip-existing`/`--replace`) and `flexkit export` / `flexkit assets export` (round-trippable tarballs with `data.ndjson`, `assets.ndjson` and files).
  - Studio: uploads now go through the single `POST /assets` endpoint which stores the blob and creates the asset node (deduplicated by content hash) in one request; entity saves connect assets by `_id` instead of nested create/update.
  - Asset Manager: per-row actions with Copy ID and Copy URL.

- ed0a3bd: Add per-column ascending and descending sort menus on entity data tables, with a clearable Sorted by toolbar control.
- c64d273: - Improved infinite scrolling functionality in data grids
  - New total records count in data grids
  - New asc/desc sorting option in data grid columns of type global
  - Improved performance when loading data
  - New sortable Updated At column in all entity data grids
  - New reload button in data grids
- 02d8b47: Keep DataTable headers sticky on vertical scroll, and show skeletons while asset search is loading.
- 438a6c8: Tie attribute default values to their data types and preserve numeric and boolean defaults in new entity forms.

## 0.0.26

### Patch Changes

- 6738fbf: Enforce list relationships due to deprecation of single element relationships
- ad393a8: Generate GraphQL operations compatible with Neo4j GraphQL Library v7: pagination and sorting moved from the `options` argument to top-level `limit`/`offset`/`sort` arguments, counts read from `xConnection { aggregate { count { nodes } } }` instead of the removed `*Aggregate` fields, filters use the dedicated input syntax (`{ eq }`, `{ in }`, `{ some }`, `{ none }`), update mutations wrap values in the explicit `{ set: ... }` operator, and reordering an ordered asset gallery updates the existing relationship edge instead of reconnecting it (which would duplicate the relationship in v7).
- 9de8878: Make asset scope optional in schema authoring and fix defineEntity export types

## 0.0.25

## 0.0.24

### Patch Changes

- 797d389: Fix API base URL

## 0.0.23

### Patch Changes

- 0fc1627: Fix API base URL

## 0.0.22

### Patch Changes

- 6f104b5: Automations plugin

## 0.0.21

### Patch Changes

- 9563bc9: Improve generated GraphQL operation safety and naming.

  Names generated queries/mutations, includes \_id in create responses for cacheability, and consistently escapes dynamic string literals in generated mutation inputs.

## 0.0.20

### Patch Changes

- cc75129: Upgrade to React 19

## 0.0.19

### Patch Changes

- 26cf0e3: Fix asset selector for single-relationship assets field
- 28516ff: Adds support for ordered multi-asset relationship fields backed by `_asset` relationships. Studio now includes an asset-specific picker, multi-file upload, thumbnail previews, manual ordering via relationship edge `sortOrder`, optimized save mutations, and clearer GraphQL schema mismatch errors.

## 0.0.18

### Patch Changes

- 943fb28: Allow the Studio to load on any pathname

## 0.0.17

### Patch Changes

- 7da8d4c: Fix error when optional 'options' field in schema is missing

## 0.0.16

### Patch Changes

- c727184: Fix React 18/19 type error mismatch
- eb01a1a: Fix type error in Resizable component
- 92faeda: Solves the following console error: "Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client."
- c344bf9: Fix TS error
- 1b1ab0d: Fix type error in Drawer component
- 7706f86: Allow auth inside Vercel sandboxes

## 0.0.15

### Patch Changes

- daffc94: Export Lucide React icons from @flexkit/studio/icons
  Upgrade SWR
  Fix TS warnings related to Novel editor

## 0.0.14

### Patch Changes

- e03c4e4: Revert noExternal config for srw and @ai-sdk/react packages

## 0.0.13

### Patch Changes

- 7e0b90c: Fix bundling issue with the SWR package (Attempted import error: 'swr' does not contain a default export)

## 0.0.12

### Patch Changes

- 98eadea: Fix bug with SWR used in file not marked with use client directive

## 0.0.11

### Patch Changes

- 3d16726: Upgrade SWR package

## 0.0.10

### Patch Changes

- 3d56ae9: Upgrade dependencies

## 0.0.9

### Patch Changes

- b2d3057: Fix bug that prevented the editor component to properly update when changing scopes

## 0.0.8

### Patch Changes

- cc3d3e2: - Upgrade dependencies
  - Fix API proxy to handle streaming bodies

## 0.0.7

### Patch Changes

- df679c2: Add multi-framework Flexkit API handlers (Next.js, Astro, TanStack Start)
  - Add new `@flexkit/studio/tanstack-start` entrypoint with `createFlexkitTanStackHandler` and `createFlexkitFetchHandler`
  - Keep `@flexkit/studio/nextjs` and `@flexkit/studio/astro` handlers aligned on the shared core request proxy behavior
  - Improve React 18/19 compatibility in asset-related UI
  - Asset Manager: improve toolbar search/filter behavior used for server-side querying
  - CLI: minor improvements to spinner + shared promise utility
  - CLI: improve error handling for `sync` command

## 0.0.6

### Patch Changes

- 937bdf3: Make API handler compatible with Next.js 15+

## 0.0.5

### Patch Changes

- 526357c: Unbundle the Studio core from the plugins. Now each package is published separately to NPM.

## 0.0.4

### Patch Changes

- 9eedd67: Fix package export config

## 0.0.3

### Patch Changes

- d2693d1: Refactor dependency bundling to include Flexkit's core and plugins
  Upgrade @apollo/client to v4.x

## 0.0.2

### Patch Changes

- Updated dependencies [3964264]
  - @flexkit/core@0.0.2
  - @flexkit/asset-manager@0.0.2
  - @flexkit/desk@0.0.2
  - @flexkit/explorer@0.0.2
