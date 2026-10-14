---
'@flexkit/cli': minor
---

New commands for custom tools. `flexkit dev` loads `flexkit.tools.ts` (after `.env.local` / `.env`), registers as your local runtime and executes the tool calls of your own Chat turns and manual runs, reloading when the file changes. `flexkit tools sync [--origin <url>]` re-reads the production tool catalog from the project's tools URL, optionally storing a new URL first, so CI can sync after every deploy. Config and tools files are bundled by a shared helper.
