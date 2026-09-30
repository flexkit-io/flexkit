---
'@flexkit/ai': patch
---

Plugins added to an automation offer all of their tools by default, including tools the provider adds later. Specific tools can still be chosen by unchecking "All tools". With "Require approval", plugin calls are screened by Jev against the automation instructions: clear, low-risk calls run immediately and appear in the run history as auto-approved, while other calls pause the run for review. A warning is shown when "Auto-approve" is used with plugin tools. Requires the matching platform API and database migration.
