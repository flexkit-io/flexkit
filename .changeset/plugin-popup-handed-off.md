---
'@flexkit/studio': patch
---

Connecting a plugin no longer fails with "Connection window was closed" while the provider's sign-in page is open: providers isolate their pages, which made the popup look closed to the Studio. The wait now ends with the connection's status (or the timeout) once the popup has left for the provider.
