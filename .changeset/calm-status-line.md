---
'@flexkit/ai': patch
---

Chat and automation runs now show one calm status line while the agent works instead of stacked cards. The line reflects the model's own reasoning as it streams, names in-flight tool and plugin calls ("Searching schema", "Calling gmail: search threads", "Awaiting approval"), keeps a fixed slot for the whole turn so the conversation never jumps, fades while the response streams, and disappears once the turn completes. Reasoning cards, "Plugin call · Auto-approved by Jev" cards, and generic tool cards are no longer rendered; failed calls still show a compact error line, and pending or human-decided approvals keep their cards. Requires the matching platform API for live plugin-call labels.
