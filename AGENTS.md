<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

The Next.js app in this monorepo is `apps/next-16`. Resolve bundled docs from `apps/next-16/node_modules/next/dist/docs/` or the hoisted `node_modules/next/dist/docs/` at the repo root.

## Versioning and compatibility

Flexkit is public: people install the `@flexkit/*` packages from npm and build on them. The hosted Studio, the desktop app and self-hosted Studios also talk to the backend across versions. Treat every change to a published package as one users will feel.

- **Add a changeset** (`.changeset/*.md`) for every user-facing change to a published package (`@flexkit/studio`, `@flexkit/schema`, `@flexkit/agent-protocol`, `@flexkit/cli`, `@flexkit/tools`). Write it for the people upgrading: what they will notice, not how it was built.
- **Pick the bump from the change.** The packages are still 0.x, where a caret range such as `^0.2.44` does not accept `0.3.0`. Until 1.0:
  - `minor`: breaking changes
  - `patch`: new features and fixes
- **Avoid breaking changes.** Prefer a backward-compatible route:
  - add optional props, parameters and fields instead of changing or removing existing ones
  - deprecate first (JSDoc `@deprecated` and a note in the changeset) and remove in a later release
  - keep old config keys, exports, CLI flags and protocol messages working
  - tolerate older and newer counterparts: a Studio talking to an older backend, an older Studio talking to a newer one
- **Public surface** includes package exports and their types, component props, the `flexkit.config.ts` shape, CLI commands, flags and output, protocol messages, and the API routes the framework adapters expose.
- **When a breaking change is unavoidable,** say so explicitly in the PR description and get it agreed first. The changeset must include migration steps.
