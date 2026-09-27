---
'@flexkit/studio': patch
---

Return 204 responses from the Flexkit API handler without a body. The local tools dev-connect tick and proxied 204 responses previously attached a JSON body, which made the framework Response constructor throw and logged a 500 in the dev server console on every overlapping tick.
