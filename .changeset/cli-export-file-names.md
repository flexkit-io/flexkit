---
'@flexkit/cli': patch
---

`flexkit export`, `flexkit assets export` and `flexkit import` no longer trust file names and paths found in a project's data or in a bundle:

- Export only uses a plain file extension from an asset's record when naming the downloaded file. A record with a crafted extension could make the CLI write a file outside the export folder.
- Export stops with a message when two assets would be saved under the same file name, instead of one silently replacing the other.
- Importing a `.tar.gz` bundle refuses file references that point outside the bundle and ignores links inside it, so a bundle from someone else cannot upload files from your machine. A folder or NDJSON file of your own can still refer to any local file.
