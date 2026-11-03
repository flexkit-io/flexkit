---
'@flexkit/cli': patch
---

Fix `flexkit knowledge add`, which failed for every file with "client/`put` must be called from a client environment". Errors from the API now show the server's message instead of "Response Error" (for example when `flexkit deploy` is refused), the same way in every command, and `flexkit approvals ls` help says that chat requests aren't listed.
