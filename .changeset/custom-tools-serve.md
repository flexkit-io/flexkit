---
'@flexkit/studio': patch
'@flexkit/ai': patch
---

Add `@flexkit/studio/tools` so customer apps can register HMAC-signed custom tools. Production invoke uses the shared signing secret. After a rotate, Flexkit sends `Flexkit-Signature` (current) and `Flexkit-Signature-Previous` (previous) so either `FLEXKIT_TOOLS_SECRET` or optional `FLEXKIT_TOOLS_SECRET_PREVIOUS` still verifies. Localhost Studio (owner/developer) can run custom tools from Agent Chat and Run now; production Studio, schedules, webhooks, and entity triggers always call the production URL.
