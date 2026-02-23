---
'@flexkit/cli': patch
---

Replace the `sync` command with a new `deploy` command in the CLI.

`deploy` now starts deploy jobs and tracks progress in real time (with SSE plus polling fallback), reports per-project outcomes (`completed`, `failed`, `no changes`), and supports graceful cancellation via `Ctrl+C`. Help output and command routing are updated to reference `deploy`, and legacy `sync` command files are removed.
