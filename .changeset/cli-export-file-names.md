---
'@flexkit/cli': patch
---

`flexkit export` and `flexkit assets export` now only use a plain file extension from an asset's record when naming the downloaded file. A record with a crafted extension could make the CLI write a file outside the export folder.
