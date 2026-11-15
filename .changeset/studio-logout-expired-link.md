---
'@flexkit/studio': patch
---

A link or an image on another site can no longer sign a visitor out of a self-hosted Studio: `/api/flexkit/logout` now refuses requests the browser marks as coming from another site. Calls from your own application and visits from the address bar work as before.

The email sign-in screen tells you when the link has expired and offers to try again. It used to stop checking after five minutes without saying anything; it now waits for as long as the link works (one hour).

The Next.js adapter sends the headers of a JSON answer, which it used to drop.
