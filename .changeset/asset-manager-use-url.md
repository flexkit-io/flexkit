---
'@flexkit/asset-manager': patch
'@flexkit/studio': patch
---

Use the `_asset.url` field in Asset Manager instead of composing a hardcoded images origin with `path`, which produced incorrect URLs for non-image assets.
