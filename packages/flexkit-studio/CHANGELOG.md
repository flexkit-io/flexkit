# @flexkit/studio

## 0.2.28

### Patch Changes

- 092471f: The chat agent can write skills: it proposes a new skill or a change to one, and the review card lets you edit the name, description and Markdown content, shows a line-by-line diff of what a change does, and saves the skill only when you approve.
- Updated dependencies [092471f]
  - @flexkit/agent-protocol@0.3.12

## 0.2.27

### Patch Changes

- d1c29bc: Plugins can connect with credentials of an app you create at the provider, starting with Shopify: the connect dialog takes the store domain and the app's Client ID and secret (or a legacy Admin API token), and a secret pasted into the chat is removed like a plugin token.

## 0.2.26

### Patch Changes

- f3bacc3: The login screen no longer crashes when the sign-in options fail to load; it says so and offers to try again.

## 0.2.25

### Patch Changes

- a9aceec: Plugin logos look the same everywhere: the chat connect card shows them edge to edge like the Marketplace instead of inset on a gray tile, logos are never stretched, and a missing or broken logo shows a plain tile instead of a broken image.

## 0.2.24

### Patch Changes

- c127cb7: Plugins that connect with an API token instead of a sign-in, such as Tinybird, open a form in the Marketplace and in the chat's connect card where you paste the token. Flexkit checks it with the provider before saving it, stores it encrypted and never shows it to the agent; Studio shows only its last four characters. Reconnect replaces the token in place. A chat message that contains a token in the format of a Marketplace plugin is not sent: Studio removes the token from the message and points you to the connect form instead.

## 0.2.23

### Patch Changes

- e220947: The hosted Studio and the desktop app tell Flexkit when the Graph app is opened in a project and when the desktop app is launched (with its version and OS), once per session, so Flexkit can see which features are used. These events follow the error reporting setting: off in local development and for Studios that list their own projects, and `flexkit:telemetry` in local storage (or the older `flexkit:error-reporting`) turns both on or off.

## 0.2.22

### Patch Changes

- 0d63b94: The hosted Studio and the desktop app report unexpected errors (uncaught errors, unhandled promise rejections and errors shown by the Studio's error screens) to Flexkit, so they can be found and fixed. A report holds the error (with email addresses masked), the Studio page path without its query string, the current project and the Studio version. Reporting is off in local development and for Studios that list their own projects; set `flexkit:error-reporting` to `on` or `off` in the browser's local storage to force it either way.

## 0.2.21

### Patch Changes

- d06715f: Graph app: a Query view. Write any GraphQL query in an editor with completion against the project schema and draw its result on the canvas: every object with an id under an entity field becomes a node, every nested relationship selection a line. The same result is shown as a table and as JSON, examples per entity get you started, and a run can add to the canvas instead of replacing it.

## 0.2.20

### Patch Changes

- 7206da3: Graph app: the inspector's entity badge is filled with the entity colour, its Open record, Expand and Hide buttons fit on one row, and the sidebar's entity list is titled "Nodes". Desktop app: the close button in a drawer's header, and anything else in a drawer or dialog that overlaps the navbar, receives clicks instead of starting a window drag.

## 0.2.19

### Patch Changes

- 8d99f93: Chat file chips know from the first render whether the file is already in Knowledge, in every session, and link to the document. The Studio hashes each upload so the platform can match it against the documents the reader may see.
- 9c85631: Knowledge documents can apply to a whole entity type: an "Applies to" picker on the document page, a Knowledge button on each Desk list, and the record panel shows the documents a record inherits from its type.
- 3aee51a: New Graph app in the Studio: explore records as nodes and relationships on a WebGL canvas. Search a record or start from an entity, expand a node's relationships page by page, hide nodes, pin positions, switch entities on and off in the legend, and open a record from the inspector. Desk lists get an "Open in Graph" button for the selected records and the record drawer a "View in Graph" button.
- 698c47d: Graph app: dragging a node pulls its neighbours along so a cluster can be pulled apart, graphs above 300 nodes label only the pointer's surroundings and the selection until zoomed in, and the entity palette grows to 12 hues validated for colour-blindness on both themes.
- cd55d49: Chat and run replays render the agent's knowledge searches as a card with the cited documents and passages, linking into the Knowledge app, and show which document it is reading. Files attached to a chat get an "Add to Knowledge" button.
- e23eff0: The Knowledge document list uses the full width and offers a list layout (the default, with Untitled UI file icons and status, type, size and date columns) and a grid layout with a preview of each document's opening text; rows, cards and the document page share a three-dots menu with download and remove.
- 1a66cb9: Documents can be attached to records. A record in the Desk shows its attached documents in a Knowledge section with an "Attach document" picker, and a document page lists the records it is linked to, with the record labels resolved from the data. When a question is about a record, the agent searches its attached documents before the rest of Knowledge.
- 1a66cb9: Record drawers now nest: opening a drawer from inside another keeps the one behind mounted and slides it aside, so a good part of it stays readable, and the gap adapts so no drawer leaves the viewport however many are stacked. The drawer primitive moved from Vaul to Base UI.
- 1a66cb9: The multiple-relationship field keys its preview badges by record id instead of label, so two related records with the same name no longer trigger React's duplicate-key warning when a record drawer opens.
- Updated dependencies [8d99f93]
  - @flexkit/agent-protocol@0.3.11

## 0.2.18

### Patch Changes

- e794dcb: Add the Knowledge app: upload documents or add public web pages, follow their indexing, control which spaces and the agent can read them, browse their passages, re-index or remove them.

## 0.2.17

### Patch Changes

- f90e59e: Desktop app: search results can be clicked and hovered again. Chromium 152 (Electron 44) made `app-region` inherited, so the dropdown rows inside the draggable navbar started a window drag instead of receiving the click; the search widget and inline popovers now opt out of the drag region.
- Updated dependencies [e786744]
  - @flexkit/agent-protocol@0.3.10

## 0.2.16

### Patch Changes

- 70919a6: Faster Studio search: requests are debounced, need at least two characters, ask for fewer hits per entity when searching all entities, and keep the previous results visible while the next request is in flight.

## 0.2.15

### Patch Changes

- 1049445: The app bar's version entry shows the Studio's package version on the web instead of a fixed 1.0.0.
  - @flexkit/schema@0.2.15

## 0.2.14

### Patch Changes

- 170a8fa: Plugin connections from the desktop app trust the Flexkit backend the app was built for; the page hostname inside the app says nothing about it.
- 170a8fa: Connecting a plugin no longer fails with "Connection window was closed" while the provider's sign-in page is open: providers isolate their pages, which made the popup look closed to the Studio. The wait now ends with the connection's status (or the timeout) once the popup has left for the provider.
  - @flexkit/schema@0.2.14

## 0.2.13

### Patch Changes

- 98ff5a8: Desktop app support: a new `@flexkit/studio/electron` adapter runs the Studio BFF inside an Electron main process (session from the app's store instead of a cookie, `flexkit://auth/callback` login), and the Studio reads an optional `window.flexkitDesktop` bridge for the dock badge, native notification focus, deep-link navigation and update prompts. The web Studio is unchanged.
- 98ff5a8: The Explorer's welcome comment no longer calls it an in-browser tool, since it also runs in the desktop app.
- 98ff5a8: Lists in an app behind the active one no longer page through the whole entity while hidden: the asset grid and the data table wait until their app is in front again before loading more.
  - @flexkit/schema@0.2.13

## 0.2.12

### Patch Changes

- 9824276: Connect card: a sign-in in progress or a failed one now survives the card being redrawn when the agent's reply finishes, and a failure names its reason instead of only "didn't finish".
  - @flexkit/schema@0.2.12

## 0.2.11

### Patch Changes

- 8df13d7: Connect plugins from the chat: the agent's connect card shows the plugin with Authorize (or Reconnect), a consent dialog with the same scope choices as the Marketplace, a "didn't finish" state with Retry, and the connected account. A finished connection continues the chat in a new turn, shown as a short "Connected …" notice.
- Updated dependencies [8df13d7]
  - @flexkit/agent-protocol@0.3.9
  - @flexkit/schema@0.2.11

## 0.2.10

### Patch Changes

- 297e77f: Show the agent's CSV and JSON exports: an "Exporting records" status line with the running row count, and an "Exported file" card with a download.
- Updated dependencies [297e77f]
  - @flexkit/agent-protocol@0.3.8
  - @flexkit/schema@0.2.10

## 0.2.9

### Patch Changes

- acfe7ea: Show the chat agent's Ask User Question cards: pick options, type your own answer, skip, or reply in the composer to answer. Questions also appear in Activity.
- Updated dependencies [acfe7ea]
  - @flexkit/agent-protocol@0.3.7
  - @flexkit/schema@0.2.9

## 0.2.8

### Patch Changes

- 1554896: Automations can be triggered when a job finishes (a schema deployment, another automation's run or a bulk action) and by a poll condition (a read-only GraphQL query checked every few minutes).
- Updated dependencies [1554896]
  - @flexkit/agent-protocol@0.3.6
  - @flexkit/schema@0.2.8

## 0.2.7

### Patch Changes

- 0237b03: Show the Activity unread dot in the success color.
- 10afed4: Show proposed automation changes as a before/after card, name the monitor an automation proposal replaces, and add "Turn into automation" to entity, poll and webhook monitors.
- Updated dependencies [10afed4]
  - @flexkit/agent-protocol@0.3.5
  - @flexkit/schema@0.2.7

## 0.2.6

### Patch Changes

- 42733f6: Show chat monitors: when the agent watches a long job (a schema deployment or a background sandbox command), a "Watching" chip with a Stop button sits above the composer, the chat keeps refreshing so a turn the monitor starts appears on its own, and the monitor's events show as a compact card in the conversation. Monitor wake-ups also appear in Activity, with their own switch in the notification settings.
- Updated dependencies [42733f6]
  - @flexkit/agent-protocol@0.3.4
  - @flexkit/schema@0.2.6

## 0.2.5

### Patch Changes

- d28fecf: Activity notifications reach you in the hosted Studio even with no Studio tab open, through Web Push, once you allow notifications. A new notification settings menu in Activity turns desktop notifications on or off for approval requests, automation failures and automation results, and the approval reminder email on or off; the settings apply to every project. Studio embedded in your own app keeps in-tab notifications and also follows these settings.
  - @flexkit/schema@0.2.5

## 0.2.4

### Patch Changes

- 6d17b6c: Approve automations the Flexkit Agent proposes from a chat: the review card shows when the automation runs, who sees it, its notifications, plugins and model, and lets you edit its instructions before choosing Create or Create and run once now. Automations gain a Notifications setting (results that need attention, every run, failures only or never), a Notify the creator switch and a Subscribers list; their results and failures appear in Activity.
- 4f3840b: The plugin list now shows a red warning triangle, with a tooltip, for a plugin whose account needs to be reconnected, instead of the green check.
- Updated dependencies [6d17b6c]
  - @flexkit/agent-protocol@0.3.3
  - @flexkit/schema@0.2.4

## 0.2.3

### Patch Changes

- 615fdac: Add an Activity section to the AI app. It lists approval requests waiting on you and opens each one on its own page, where you can approve or reject it. A bell next to your avatar shows how many requests are waiting, from every app. While Studio is in the background, new items show as desktop notifications once you turn them on from Activity.
- Updated dependencies [615fdac]
  - @flexkit/agent-protocol@0.3.2
  - @flexkit/schema@0.2.3

## 0.2.2

### Patch Changes

- 75b52d9: The agent chat composer stays open while a turn runs. A message sent meanwhile is shown at once and either steers the running turn or starts the next one when it ends; the stop button becomes the send button as soon as there is a draft. A message the agent received mid-turn is shown inside the reply at the point it arrived.
- 75b52d9: Start a new agent chat and send its first message in one request instead of two.
- f68d6ed: Studio quality of life: the AI app is now the first tab and the default app of a project. Opened apps stay mounted while another app is in front, so switching from a chat to Desk, the Asset Manager or the Explorer and back finds the chat (and the other apps) exactly as they were left, with the app bar button returning to the page each app was last on. The agent composer also remembers unsent text per chat, including the New chat page, across chat switches and reloads.
- 4afd645: The agent composer's prompt input now follows the shadcn/ui Input Group and Attachment pattern: a round outlined attach button, a round primary send button with an up arrow, a padded textarea, and a header that lists drafted attachments as removable chips when nothing custom is rendered in it. The `Attachment` primitives are exported from `@flexkit/studio/ui`, and the shadcn config now targets the `new-york-v4` registry style. Every prompt input export keeps its name and props.

  A new chat now greets with the composer in the middle of the page, ChatGPT-style, with the intro paragraph removed and the placeholder reading "Ask Flexkit anything about <project>...". The composer moves to the bottom as soon as the first message is sent, and its corners are rounder.

- Updated dependencies [75b52d9]
  - @flexkit/agent-protocol@0.3.1
  - @flexkit/schema@0.2.2

## 0.2.1

### Patch Changes

- 6d2d7a3: Resume agent streams across reconnects without replaying accepted output, preserve approval and structured-output state, and reduce chat polling with lightweight status requests and paginated history.
  - @flexkit/schema@0.2.1

## 0.2.0

### Minor Changes

- bcfdbad: Schema change approvals. The Flexkit Agent can now propose schema changes on app-managed projects; approvals of `kind: 'schema'` carry a `preview.schema` summary and render a dedicated card listing the entities and attributes added, changed or removed, with breaking changes called out. After an approved schema deployment completes, the Studio refetches the project schema so the new entities appear without a reload.

### Patch Changes

- Updated dependencies [bcfdbad]
  - @flexkit/agent-protocol@0.3.0
  - @flexkit/schema@0.2.0

## 0.1.1

### Patch Changes

- 8cce4ae: The BFF (`/api/flexkit/*`) now answers 401 to an `Authorization: Bearer flk-…` API token instead of forwarding it as the Studio session. API tokens belong on direct calls to the project API; the BFF only carries a user's session.
  - @flexkit/schema@0.1.1

## 0.1.0

### Minor Changes

- 8e85705: The Studio renders the schema deployed to each project instead of a bundled config. Breaking:
  - Mount with `<FlexkitStudio projectIds={['abc']} basename="/studio" />`; the `config` prop is gone and `basePath` moved to the `basename` prop. The Studio fetches each project's schema from `GET /<projectId>/api/schema` after login.
  - Desk, Asset Manager, Explorer and AI are built in. `@flexkit/desk`, `@flexkit/explorer`, `@flexkit/asset-manager` and `@flexkit/ai` are folded into `@flexkit/studio` (their public types are re-exported from it) and the `extensions`, `contributes`, `defineExtension`, navbar, `formFields` and `previewFields` extension points are removed.
  - Icons are lucide names (`menu.icon: 'Tag'`, `groups[].icon`), rendered on demand so the icon set no longer ships in the main bundle. `hidden` / `readOnly` are booleans. Form validation runs from the deployed JSON Schema with messages generated from the attribute label.
  - `defineConfig` and `defineEntity` are re-exported from `@flexkit/schema`.

- 7e9cd0b: Hosted mode. `projectIds` is now optional on `<FlexkitStudio />`: without it the Studio signs the user in once (no project to pick on the login screen), lists every project the account can access across its teams, opens the one used last on this browser, and switches projects from the navbar, grouped by team. Schemas are fetched per visited project. `useConfig()` exposes `mode` and `projectSummaries`. The framework adapters proxy the reserved `/api/flexkit/-/…` segment to the user-level Flexkit API with the session as a bearer token. Passing `projectIds` keeps today's behaviour.
- af083bf: **Breaking:** custom tools and code skills no longer live in the Studio package. `@flexkit/studio/tools` is removed; import `defineTool`, `defineSkill` and `defineTools` from `@flexkit/tools` and serve them with `createToolsHandler` on their own route. `createFlexkitApiHandler`, `createFlexkitAstroHandler`, `createFlexkitTanStackHandler` and `createFlexkitFetchHandler` take no options any more and only handle Studio auth and the API proxy. The Studio no longer polls a local tools runtime from the page: run `flexkit dev` instead, which works with a self-hosted, hosted or desktop Studio alike.

### Patch Changes

- ec7d261: New built-in `previewType: 'rating'`: numeric attributes render as filled stars in lists, with `options.max` as the star count (default 5).
- Updated dependencies [8e85705]
- Updated dependencies [ec7d261]
  - @flexkit/schema@0.1.0

## 0.0.36

### Patch Changes

- c01435a: Add plugins to an automation from a searchable "+ Plugin tools" menu instead of listing every plugin. Each added plugin is one compact row with its account, tools, status, and a remove button. Plugins and Slack or Microsoft Teams delivery can be connected in place through the sign-in popup, so unsaved automation changes are kept. Delivery rows now sit under Memories, show "Not connected" inline, and report a loading failure instead of spinning indefinitely.

  Export the `Popover` components from `@flexkit/studio/ui`.

## 0.0.35

### Patch Changes

- a24e18f: Return 204 responses from the Flexkit API handler without a body. The local tools dev-connect tick and proxied 204 responses previously attached a JSON body, which made the framework Response constructor throw and logged a 500 in the dev server console on every overlapping tick.
- d0be938: Use Jev to assess Chat GraphQL mutations and plugin actions, automatically approving clear, low-risk requests and asking the user only when review is needed. Charge Jev evaluations to the team and show them in project Usage. Keep Chat responses aligned with the actual approval decision.

  Make approval requests easier to understand: show the action and connected account in plain language, keep technical details collapsed, and let users reject without entering a reason. Automation approval flows retain their existing behavior. Left-align shared dialog titles and descriptions.

- 05bec33: Reduce entity grid work by reusing rich-text serializers, memoizing query generation,
  omitting hidden assets and unused counts, and avoiding speculative pagination on
  initial table load. Asset-manager tag menus share a display-only query without
  asset relationship previews or counts.
- 602aa27: Add the Plugins Marketplace with catalog and detail pages, OAuth connection management, automatic access to all connected, permitted plugin tools in chat, and explicit tool selection for automations. Trusted chat read tools run without confirmation; other plugin calls follow the approval policy. Support plugin tool approvals and read-only plugin skills that can be copied into editable Studio skills. Requires the matching platform plugins API and database migrations.

  Export the shared Alert components from `@flexkit/studio/ui` for marketplace status and permission messages.

- 2581ddd: Virtualize columns in entity grids so offscreen previews and thumbnails mount only
  as they approach the viewport. Preserve column widths, sorting, selection, and
  vertical pagination, and reset horizontal scrolling when changing entities.

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
