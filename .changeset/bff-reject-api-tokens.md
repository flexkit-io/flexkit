---
'@flexkit/studio': patch
---

The BFF (`/api/flexkit/*`) now answers 401 to an `Authorization: Bearer flk-…` API token instead of forwarding it as the Studio session. API tokens belong on direct calls to the project API; the BFF only carries a user's session.
