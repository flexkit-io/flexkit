---
'@flexkit/cli': patch
---

`flexkit import` and `flexkit export` find the default scope through `isDefault`, so projects whose default scope has another name (for example `eu`) import plain values into it and export them as plain values again.
