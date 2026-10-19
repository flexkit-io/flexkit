---
'@flexkit/studio': patch
---

Desktop app support: a new `@flexkit/studio/electron` adapter runs the Studio BFF inside an Electron main process (session from the app's store instead of a cookie, `flexkit://auth/callback` login), and the Studio reads an optional `window.flexkitDesktop` bridge for the dock badge, native notification focus, deep-link navigation and update prompts. The web Studio is unchanged.
