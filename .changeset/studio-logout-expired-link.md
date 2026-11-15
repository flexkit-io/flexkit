---
'@flexkit/studio': patch
---

Signing out of a self-hosted Studio now takes a request from the Studio's own page. Before, a link or an image on any other site could sign a visitor out. If your application calls `/api/flexkit/logout` itself, send it as a `POST` from the same origin; a `GET` now answers 405.

The email sign-in screen tells you when the link has expired and offers to try again. It used to keep waiting without saying anything, and it now waits for as long as the link works (15 minutes).
