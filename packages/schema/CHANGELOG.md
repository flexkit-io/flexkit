# @flexkit/schema

## 0.2.12

## 0.2.11

## 0.2.10

## 0.2.9

## 0.2.8

## 0.2.7

## 0.2.6

## 0.2.5

## 0.2.4

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

## 0.1.1

## 0.1.0

### Minor Changes

- 8e85705: New package: types and helpers for `flexkit.config.ts`. `defineConfig` / `defineEntity`, the authoring types (`ProjectConfig`, `Entity`, `Attribute`) and their deployed counterparts (`UiProjectSchema`, `UiEntity`, `UiAttribute`), and `serializeConfig`, which compiles Zod `validation` functions to JSON Schema (draft-07) and rejects anything the Studio form cannot enforce with a `SchemaSerializationError` that names the entity and attribute.

### Patch Changes

- ec7d261: New built-in `previewType: 'rating'`: numeric attributes render as filled stars in lists, with `options.max` as the star count (default 5).
