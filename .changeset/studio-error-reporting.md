---
'@flexkit/studio': patch
---

The hosted Studio and the desktop app report unexpected errors (uncaught errors, unhandled promise rejections and errors shown by the Studio's error screens) to Flexkit, so they can be found and fixed. A report holds the error, the Studio page path without its query string, the current project and the Studio version; never record data or form values. Reporting is off in local development and for Studios that list their own projects; set `flexkit:error-reporting` to `on` or `off` in the browser's local storage to force it either way.
