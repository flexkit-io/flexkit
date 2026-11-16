---
'@flexkit/tools': patch
---

The actor a tool handler receives now says when it is called by a personal automation: `actor.visibility` is `'personal'` and `actor.creatorId` is the member the automation belongs to. A personal automation runs with that member's access, so its `spaceCodes` are that member's spaces. Both fields are absent for project and space automations, and with a backend that does not report them, so existing handlers keep working unchanged.
