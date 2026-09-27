---
'@flexkit/studio': patch
'@flexkit/asset-manager': patch
---

Reduce entity grid work by reusing rich-text serializers, memoizing query generation,
omitting hidden assets and unused counts, and avoiding speculative pagination on
initial table load. Asset-manager tag menus share a display-only query without
asset relationship previews or counts.
