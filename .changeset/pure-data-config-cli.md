---
"@flexkit/cli": minor
---

`flexkit deploy` now loads `flexkit.config.ts` (or `.js` / `.mjs`) and serializes it through `@flexkit/schema` before sending it: `validation` functions become JSON Schema, and `title` and `menuGroups` are deployed with the schema. Breaking: `flexkit.config.tsx` / `.jsx` files are refused with migration guidance (rename to `.ts`, use lucide icon names such as `icon: 'Tag'`, booleans for `hidden` / `readOnly`, and drop `extensions`, `basePath` and `commands`). A validation that uses `refine()`, `transform()` or an unsupported keyword fails the deploy instead of being silently dropped. `--force` is a boolean flag.
