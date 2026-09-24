# @flexkit/studio

## 0.0.35

### Patch Changes

- d0be938: Use Jev to assess Chat GraphQL mutations and plugin actions, automatically approving clear, low-risk requests and asking the user only when review is needed. Charge Jev evaluations to the team and show them in project Usage. Keep Chat responses aligned with the actual approval decision.

  Make approval requests easier to understand: show the action and connected account in plain language, keep technical details collapsed, and let users reject without entering a reason. Automation approval flows retain their existing behavior. Left-align shared dialog titles and descriptions.

- 602aa27: Add the Plugins Marketplace with catalog and detail pages, OAuth connection management, automatic access to all connected, permitted plugin tools in chat, and explicit tool selection for automations. Trusted chat read tools run without confirmation; other plugin calls follow the approval policy. Support plugin tool approvals and read-only plugin skills that can be copied into editable Studio skills. Requires the matching platform plugins API and database migrations.

  Export the shared Alert components from `@flexkit/studio/ui` for marketplace status and permission messages.

## 0.0.34

### Patch Changes

- bb111a6: Add file attachments to the agent chat prompt.
  - `@flexkit/ai`: the chat composer gets a "+" menu with "Add photos or files". Images (PNG, JPEG, GIF, WebP), PDFs and text-like files (TXT, MD, CSV, TSV, JSON, NDJSON, XML, YAML, HTML, CSS, JS/TS, Python, SQL, GraphQL, logs) up to 20 MB are uploaded straight to the platform file store and sent to the agent with the message. Images render as thumbnails with a fullscreen preview, other files as chips showing name and type. New `uploadAgentChatAttachment` API method, `attachments` on `sendAgentChatMessage`, and `AgentChatAttachment` type.
  - `@flexkit/studio`: `PromptInput` `accept` now honours `.ext` patterns like the native attribute; `PromptInputActionAddAttachments` closes the menu on select; `PromptInputActionMenuContent` no longer refocuses the trigger on close, so its tooltip does not pop up after picking an action.

- 5774b96: Rename the Studio composition API to extensions and update all official extension factories, examples, and package documentation.

  This is a breaking API change: use `extensions` for project and nested configuration, replace the former composition type with `StudioExtension`, and supply a machine-readable `id` and required `contributes` object. The optional `name` is a display label. Export `StudioContributions` and the new `defineExtension` helper without compatibility aliases.

  Add the `@flexkit/ai` README with installation, configuration, and an overview of AI workflows, custom tools, and skills.

## 0.0.33

### Patch Changes

- 9bbe14b: Allow dragging files onto the Asset Manager list or grid to upload them through the same path as the Upload button.
- 9bbe14b: Show a loading state on the Asset Manager upload button while files are uploading and the asset list refreshes.
- 9bbe14b: Use the `_asset.url` field in Asset Manager instead of composing a hardcoded images origin with `path`, which produced incorrect URLs for non-image assets.
- 118ce38: Show the total record count when expanding a multiple relationship form field, matching entity listing tables.
- b6d930b: Patch security dependencies across the workspace.
  - Pin `svgo` to 4.1.0 (GHSA-2p49-hgcm-8545, GHSA-w27v-7q3p-w38r)
  - Pin `brace-expansion` to 1.1.18 and 5.0.9 (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895)
  - Pin `seroval` to >=1.5.6 (GHSA-mv8w-475r-vwqw)
  - Upgrade Next.js to 16.3.5 (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4)
  - Upgrade Astro to 7.3.2
  - Upgrade Vitest to 3.2.6 (GHSA-5xrq-8626-4rwp)

## 0.0.32

### Patch Changes

- e598bc6: Move isPrimary from attributes to an optional entity-level display field that names the attribute shown in relationship previews.
- d1ebaf9: Smooth virtualized DataTable scrolling with spacer rows, higher overscan, and cheaper recycled cells.
- 36bf20f: Rename attribute flags to `hidden`, `readOnly`, `unique`, and `searchable`, and support conditional `hidden` / `readOnly` callbacks in Studio forms.
- 59ccc03: Add `@flexkit/studio/tools` so customer apps can register HMAC-signed custom tools. Production invoke uses the shared signing secret. After a rotate, Flexkit sends `Flexkit-Signature` (current) and `Flexkit-Signature-Previous` (previous) so either `FLEXKIT_TOOLS_SECRET` or optional `FLEXKIT_TOOLS_SECRET_PREVIOUS` still verifies. Localhost Studio (owner/developer) can run custom tools from Agent Chat and Run now; production Studio, schedules, webhooks, and entity triggers always call the production URL.
- 53b79be: Keep the active DataTable sort (and where) on infinite-scroll pages after the first request.
- 8223254: Add entity field groups so long forms can be organized into tabs, including an All fields tab that can be hidden.
- 8976298: GraphQL queries performance improvements
- 53b79be: Speed up DataTable listings with count-store totals, index-backed nullable-column sorting, and less frequent local tools polling.
- 0b115f8: Chat dictation, rolling thinking states"
- 5659fa3: Version-controlled skills. Skills can now be added via code
- 1877cec: Add an entity selector to global search so queries can be limited to one collection, hide the empty state while results are loading, and reset the filter when the project or schema changes.
- 261f06a: Keep entity lists loading while older GraphQL schemas fall back from count-store totals to aggregate counts.

## 0.0.31

### Patch Changes

- 85ef07c: Minor style adjustments and fixes

## 0.0.30

### Patch Changes

- 306e794: Agent chat

## 0.0.29

### Patch Changes

- 1c89ae9: GraphQL query performance: asset connections are now bounded (`first: 3` in list grids, `first: 25` in forms, server-sorted by `sortOrder`) instead of expanding every connected asset per row, nested relationship selections are capped at the 3 items grids actually preview, base64 `lqip` placeholders are no longer fetched for related-entity assets, the relationship picker uses the lightweight `list` selection, pagination pages skip the top-level aggregate count, and Asset Manager tag mutations refetch with the `list` selection. List grids keep accurate "+N" asset badges via the connection aggregate count. Entity edit forms with more than 25 linked assets can load additional pages in the asset-multiple field without treating paged-in edges as new connects.
- 68e0fec: Spaces authorization layer: declare spaces in flexkit.config.tsx and bind them to entities and attributes to scope visibility and editability. The CLI includes space definitions in the deploy payload, the Studio exposes the user's space memberships and filters space-bound entities/attributes from the Desk sidebar, grids and forms, and Automations gain a visibility picker (Project / Space / Personal) with space badges in the list.
- ca6fb4b: New approvals section for approving mutations (HITL)

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

- 6f104b5: Automations extension

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

- 526357c: Unbundle the Studio core from the extensions. Now each package is published separately to NPM.

## 0.0.4

### Patch Changes

- 9eedd67: Fix package export config

## 0.0.3

### Patch Changes

- d2693d1: Refactor dependency bundling to include Flexkit's core and extensions
  Upgrade @apollo/client to v4.x

## 0.0.2

### Patch Changes

- Updated dependencies [3964264]
  - @flexkit/core@0.0.2
  - @flexkit/asset-manager@0.0.2
  - @flexkit/desk@0.0.2
  - @flexkit/explorer@0.0.2
