---
'@flexkit/studio': patch
---

The hosted Studio and the desktop app tell Flexkit when the Graph app is opened in a project and when the desktop app is launched (with its version and OS), once per session, so Flexkit can see which features are used. These events follow the error reporting setting: off in local development and for Studios that list their own projects, and `flexkit:error-reporting` in local storage turns both on or off.
