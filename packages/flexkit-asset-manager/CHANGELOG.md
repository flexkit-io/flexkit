# @flexkit/asset-manager

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
