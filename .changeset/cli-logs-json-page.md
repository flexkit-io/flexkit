---
'@flexkit/cli': patch
---

`flexkit logs --json` prints the page as an object, `{ type, since, until, limit, data, nextBefore }`, so a script can read `nextBefore` to fetch the next page with `--before`. Entries are in `.data`, newest first; `--follow --json` still prints one entry per line.
