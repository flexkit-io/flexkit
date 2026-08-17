# @flexkit/ai

## 0.0.4

### Patch Changes

- 0b115f8: Chat dictation, rolling thinking states"
- Updated dependencies [8976298]
- Updated dependencies [0b115f8]
  - @flexkit/studio@0.0.32

## 0.0.3

### Patch Changes

- 85ef07c: Minor style adjustments and fixes
- Updated dependencies [85ef07c]
  - @flexkit/studio@0.0.31

## 0.0.2

### Patch Changes

- 306e794: Agent chat
- Updated dependencies [306e794]
  - @flexkit/studio@0.0.30

## 0.0.1

### Patch Changes

- 7377201: Rename `@flexkit/automations` to `@flexkit/ai` and add Skills.
  - The plugin is now exported as `AI()` from `@flexkit/ai` and mounts at the `ai` app route (`/ai/automations`, `/ai/runs`, `/ai/approvals`).
  - New Skills section (`/ai/skills`): create reusable Markdown skills with project, space, or personal visibility.
  - Skills can be attached to an automation from the Tools section of the automation form; attached skills are always loaded into the agent context. All other visible skills stay discoverable by the agent at runtime, which loads them on demand when they match the task.

- 68e0fec: Spaces authorization layer: declare spaces in flexkit.config.tsx and bind them to entities and attributes to scope visibility and editability. The CLI includes space definitions in the deploy payload, the Studio exposes the user's space memberships and filters space-bound entities/attributes from the Desk sidebar, grids and forms, and Automations gain a visibility picker (Project / Space / Personal) with space badges in the list.
- ca6fb4b: New approvals section for approving mutations (HITL)
- Updated dependencies [1c89ae9]
- Updated dependencies [68e0fec]
- Updated dependencies [ca6fb4b]
  - @flexkit/studio@0.0.29
