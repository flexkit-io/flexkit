---
'@flexkit/studio': patch
---

A provider sign-in (GitHub, Google) no longer hangs when Flexkit does not answer the final step. After 15 seconds the login counts as failed and the login screen shows again, so you can sign in again. An error response from Flexkit also counts as a failed login. This covers the `/api/flexkit/get-token` route of the Next.js, Astro and TanStack Start adapters, and the desktop app.
