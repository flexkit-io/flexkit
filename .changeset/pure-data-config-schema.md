---
"@flexkit/schema": minor
---

New package: types and helpers for `flexkit.config.ts`. `defineConfig` / `defineEntity`, the authoring types (`ProjectConfig`, `Entity`, `Attribute`) and their deployed counterparts (`UiProjectSchema`, `UiEntity`, `UiAttribute`), and `serializeConfig`, which compiles Zod `validation` functions to JSON Schema (draft-07) and rejects anything the Studio form cannot enforce with a `SchemaSerializationError` that names the entity and attribute.
