# @flexkit/cli

## 0.1.23

### Patch Changes

- 58e2c20: `flexkit import` and `flexkit export` find the default scope through `isDefault`, so projects whose default scope has another name (for example `eu`) import plain values into it and export them as plain values again.

## 0.1.22

### Patch Changes

- 952f627: `flexkit logs --json` prints the page as an object, `{ type, since, until, limit, data, nextBefore }`, so a script can read `nextBefore` to fetch the next page with `--before`. Entries are in `.data`, newest first; `--follow --json` still prints one entry per line.

## 0.1.21

### Patch Changes

- de6d4ce: Add commands for project administration, each with help, examples and a docs page:
  - `flexkit tokens`: create, list and revoke project API tokens.
  - `flexkit members`: list members and invitations, invite, change roles, remove.
  - `flexkit webhooks` and `flexkit cors`: manage webhooks and the browser origins allowed to call the API.
  - `flexkit logs`: API, webhook and AI request logs, with `--since` and `--follow`.
  - `flexkit memory`: read, replace or clear what the agent remembers about you.
  - `flexkit project pause` and `flexkit project unpause`.

  API tokens can now read and add knowledge, read approvals, and list plugins. Managing tokens and members, pausing, deciding approvals and personal data (chats, activity, agent memory) still need `flexkit login`.

## 0.1.20

### Patch Changes

- b5bde83: Fix `flexkit knowledge add`, which failed for every file with "client/`put` must be called from a client environment". Errors from the API now show the server's message instead of "Response Error" (for example when `flexkit deploy` is refused), the same way in every command, and `flexkit approvals ls` help says that chat requests aren't listed.

## 0.1.19

### Patch Changes

- 4259b05: Add commands for most of what the Flexkit API offers, each with help, examples and a docs page:
  - `link` and `unlink` save the project of a folder in `.flexkit/project.json`, so commands no longer need `--project`.
  - `schema` pulls, shows and diffs the deployed schema; `schema diff --exit-code` and `--fail-on-breaking` work in CI.
  - `deployments` lists, inspects and replays schema deployments.
  - `records` lists, reads, counts, creates, updates and deletes records without writing GraphQL; `search` searches them; `query` runs any GraphQL operation.
  - `chat` talks to the Chat Agent, interactively or with a prompt, and lists, shows, renames, stops and deletes chats.
  - `automations`, `runs` and `approvals` create, edit and run automations, follow run logs, download transcripts and artifacts, and approve or deny changes.
  - `skills` manages skills and syncs them with a folder of Markdown files (`pull`, `push`).
  - `knowledge` uploads, searches, downloads and links knowledge documents.
  - `plugins` installs and connects plugins; `mcp` prints the project's MCP URL and installs it in Claude Code, Cursor, VS Code or Windsurf.
  - `activity` reads the activity inbox; `usage` shows usage against the plan limits.
  - `api` sends an authenticated request to any API endpoint.

  Commands that read data print JSON on stdout with `--json`, destructive commands take `--yes`, and `FLEXKIT_TOKEN`, `FLEXKIT_PROJECT_ID` and `FLEXKIT_API_URL` configure the CLI in CI. `flexkit project` reaches the account API again.

## 0.1.18

### Patch Changes

- @flexkit/schema@0.2.15

## 0.1.17

### Patch Changes

- @flexkit/schema@0.2.14

## 0.1.16

### Patch Changes

- @flexkit/schema@0.2.13

## 0.1.15

### Patch Changes

- @flexkit/schema@0.2.12

## 0.1.14

### Patch Changes

- @flexkit/schema@0.2.11

## 0.1.13

### Patch Changes

- @flexkit/schema@0.2.10

## 0.1.12

### Patch Changes

- @flexkit/schema@0.2.9

## 0.1.11

### Patch Changes

- @flexkit/schema@0.2.8

## 0.1.10

### Patch Changes

- @flexkit/schema@0.2.7

## 0.1.9

### Patch Changes

- @flexkit/schema@0.2.6

## 0.1.8

### Patch Changes

- @flexkit/schema@0.2.5

## 0.1.7

### Patch Changes

- @flexkit/schema@0.2.4

## 0.1.6

### Patch Changes

- @flexkit/schema@0.2.3

## 0.1.5

### Patch Changes

- @flexkit/schema@0.2.2

## 0.1.4

### Patch Changes

- @flexkit/schema@0.2.1

## 0.1.3

### Patch Changes

- 4f2bc16: Republish of 0.1.2, whose npm publish was left in a staged state by an interrupted release and never became installable. No functional changes beyond 0.1.2: `flexkit deploy` now depends on `@flexkit/schema` 0.2.0.

## 0.1.2

### Patch Changes

- @flexkit/schema@0.2.0

## 0.1.1

### Patch Changes

- @flexkit/schema@0.1.1

## 0.1.0

### Minor Changes

- af083bf: New commands for custom tools. `flexkit dev` loads `flexkit.tools.ts` (after `.env.local` / `.env`), registers as your local runtime and executes the tool calls of your own Chat turns and manual runs, reloading when the file changes. `flexkit tools sync [--origin <url>]` re-reads the production tool catalog from the project's tools URL, optionally storing a new URL first, so CI can sync after every deploy. Config and tools files are bundled by a shared helper.
- 8e85705: `flexkit deploy` now loads `flexkit.config.ts` (or `.js` / `.mjs`) and serializes it through `@flexkit/schema` before sending it: `validation` functions become JSON Schema, and `title` and `menuGroups` are deployed with the schema. Breaking: `flexkit.config.tsx` / `.jsx` files are refused with migration guidance (rename to `.ts`, use lucide icon names such as `icon: 'Tag'`, booleans for `hidden` / `readOnly`, and drop `extensions`, `basePath` and `commands`). A validation that uses `refine()`, `transform()` or an unsupported keyword fails the deploy instead of being silently dropped. `--force` is a boolean flag.

### Patch Changes

- Updated dependencies [8e85705]
- Updated dependencies [ec7d261]
- Updated dependencies [af083bf]
  - @flexkit/schema@0.1.0
  - @flexkit/tools@0.1.0

## 0.0.13

### Patch Changes

- 3033004: Load Flexkit configs that import Node.js built-in modules by name. `flexkit deploy` failed while bundling configs that pull in `@vercel/blob`, because `import { Readable } from "stream"` was rewritten to a stub that does not expose `Readable`. A failed bundle also hid that error by trying to delete a temp file that was never written.

## 0.0.12

### Patch Changes

- b6d930b: Patch security dependencies across the workspace.
  - Pin `svgo` to 4.1.0 (GHSA-2p49-hgcm-8545, GHSA-w27v-7q3p-w38r)
  - Pin `brace-expansion` to 1.1.18 and 5.0.9 (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895)
  - Pin `seroval` to >=1.5.6 (GHSA-mv8w-475r-vwqw)
  - Upgrade Next.js to 16.3.5 (GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4)
  - Upgrade Astro to 7.3.2
  - Upgrade Vitest to 3.2.6 (GHSA-5xrq-8626-4rwp)

## 0.0.11

### Patch Changes

- e598bc6: Move isPrimary from attributes to an optional entity-level display field that names the attribute shown in relationship previews.
- 36bf20f: Rename attribute flags to `hidden`, `readOnly`, `unique`, and `searchable`, and support conditional `hidden` / `readOnly` callbacks in Studio forms.
- 8223254: Add entity field groups so long forms can be organized into tabs, including an All fields tab that can be hidden.

## 0.0.10

### Patch Changes

- a9b8e8d: Security patches

## 0.0.9

### Patch Changes

- 68e0fec: Spaces authorization layer: declare spaces in flexkit.config.tsx and bind them to entities and attributes to scope visibility and editability. The CLI includes space definitions in the deploy payload, the Studio exposes the user's space memberships and filters space-bound entities/attributes from the Desk sidebar, grids and forms, and Automations gain a visibility picker (Project / Space / Personal) with space badges in the list.

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
