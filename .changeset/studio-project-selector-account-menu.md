---
'@flexkit/studio': patch
---

- The project selector no longer offers "New project". Create new projects from the Dashboard; an account's first project can still be created in Studio.
- The account menu under your avatar cuts a long name or email address to the menu width with an ellipsis; hover it to see it in full.
- Select fields have the same muted background as text inputs in dark mode, so every select in Studio matches the fields around it. This includes the exported `SelectTrigger` in custom apps; pass your own background class (for example `fk:dark:bg-transparent`) to keep one transparent.
