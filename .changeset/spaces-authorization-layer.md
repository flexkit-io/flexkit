---
'@flexkit/ai': patch
'@flexkit/studio': patch
'@flexkit/desk': patch
'@flexkit/cli': patch
---

Spaces authorization layer: declare spaces in flexkit.config.tsx and bind them to entities and attributes to scope visibility and editability. The CLI includes space definitions in the deploy payload, the Studio exposes the user's space memberships and filters space-bound entities/attributes from the Desk sidebar, grids and forms, and Automations gain a visibility picker (Project / Space / Personal) with space badges in the list.
