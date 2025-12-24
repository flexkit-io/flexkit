# @flexkit/studio

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
