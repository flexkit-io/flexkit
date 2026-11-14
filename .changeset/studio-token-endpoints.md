---
'@flexkit/studio': patch
---

The Studio's sign-in endpoints (`/api/flexkit/get-token` and `/api/flexkit/set-token`) now only accept a sign-in that the same browser started, and only return to a page of the Studio itself:

- A provider sign-in (Google, GitHub) carries a one-time value that the callback checks against the browser's cookie. A link to the callback with someone else's code no longer signs you in to their account.
- The email sign-in endpoint refuses requests from other sites and values that are not a session id.
- The `redirect` parameter can no longer send the browser to another site.

Self-hosted Studios get this by updating the package; no configuration is needed.
