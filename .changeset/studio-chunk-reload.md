---
'@flexkit/studio': patch
---

When the Studio was deployed again while it was open, opening an app whose code belonged to the previous deployment showed a red "Failed to load chunk …" error. It now says that a new version is available and offers a Reload button. The page is not reloaded on its own, so when only one app fails, unsaved work in the other open apps is kept until you choose to reload.
