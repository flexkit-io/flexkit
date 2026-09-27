---
'@flexkit/cli': patch
---

Load Flexkit configs that import Node.js built-in modules by name. `flexkit deploy` failed while bundling configs that pull in `@vercel/blob`, because `import { Readable } from "stream"` was rewritten to a stub that does not expose `Readable`. A failed bundle also hid that error by trying to delete a temp file that was never written.
