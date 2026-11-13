---
'@flexkit/cli': patch
'@flexkit/studio': patch
---

Explain hibernated projects. A Free project hibernates after a week without activity: its data is kept and an owner wakes it up from the dashboard. Studio shows a "Project Hibernated" notice with a link to wake it up (from the new `PROJECT_HIBERNATED` API error code), and `flexkit project pause|unpause` says the project is hibernated and points to the dashboard instead of trying to pause or unpause it.
