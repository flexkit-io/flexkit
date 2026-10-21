---
'@flexkit/studio': patch
---

Desktop app: search results can be clicked and hovered again. Chromium 152 (Electron 44) made `app-region` inherited, so the dropdown rows inside the draggable navbar started a window drag instead of receiving the click; the search widget and inline popovers now opt out of the drag region.
