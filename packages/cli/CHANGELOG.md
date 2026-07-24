# @flexkit/cli

## 0.0.8

### Patch Changes

- d68ec49: Add a CLI asset import/export pipeline and migrate uploads to the one-shot assets endpoint.
  - CLI: new `flexkit assets upload` (files, directories, URLs, `--id-from`, `--tag`, `--json`), `flexkit import` (NDJSON/directory/tarball with `_asset` and `_ref` references, `--dry-run`, `--skip-existing`/`--replace`) and `flexkit export` / `flexkit assets export` (round-trippable tarballs with `data.ndjson`, `assets.ndjson` and files).
  - Studio: uploads now go through the single `POST /assets` endpoint which stores the blob and creates the asset node (deduplicated by content hash) in one request; entity saves connect assets by `_id` instead of nested create/update.
  - Asset Manager: per-row actions with Copy ID and Copy URL.

- 438a6c8: Tie attribute default values to their data types and preserve numeric and boolean defaults in new entity forms.

## 0.0.7

### Patch Changes

- 16755d7: Add `--allow-breaking-changes` for intentional schema removals and improve deploy validation error paths and documentation links.
- bd9428e: Add a `--force` flag to deploy unchanged schemas.

## 0.0.6

### Patch Changes

- eb522b7: Add esbuild dependency

## 0.0.5

### Patch Changes

- 2b0469d: Fix config loading in React 19 apps when running CLI commands.

  The CLI config bundler no longer injects a top-level `React` identifier that could conflict with bundled code (`Identifier 'React' has already been declared`), and now externalizes React/ReactDOM runtime entrypoints (`react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `react-dom/server`, `react-dom/test-utils`) to avoid mixed React runtime internals (`ReactCurrentDispatcher` errors).

## 0.0.4

### Patch Changes

- 479036f: Replace the `sync` command with a new `deploy` command in the CLI.

  `deploy` now starts deploy jobs and tracks progress in real time (with SSE plus polling fallback), reports per-project outcomes (`completed`, `failed`, `no changes`), and supports graceful cancellation via `Ctrl+C`. Help output and command routing are updated to reference `deploy`, and legacy `sync` command files are removed.

## 0.0.3

### Patch Changes

- 2f04c25: CLI: Add 'project' command

## 0.0.2

### Patch Changes

- df679c2: Add multi-framework Flexkit API handlers (Next.js, Astro, TanStack Start)
  - Add new `@flexkit/studio/tanstack-start` entrypoint with `createFlexkitTanStackHandler` and `createFlexkitFetchHandler`
  - Keep `@flexkit/studio/nextjs` and `@flexkit/studio/astro` handlers aligned on the shared core request proxy behavior
  - Improve React 18/19 compatibility in asset-related UI
  - Asset Manager: improve toolbar search/filter behavior used for server-side querying
  - CLI: minor improvements to spinner + shared promise utility
  - CLI: improve error handling for `sync` command
