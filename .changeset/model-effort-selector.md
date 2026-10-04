---
'@flexkit/ai': minor
---

The chat composer and the automation form now offer a reasoning-effort selector next to the model selector, showing exactly the efforts the chosen model supports, and a new "Auto" model that lets the platform pick the model and effort per message or run. New chats and automations default to Auto; existing ones keep their stored model. Model ids are stored as `<gatewayModelId>:<effort>` or `auto`; the last chosen model and effort are remembered separately in local storage. Requires the matching platform API; against an older API the model list still renders and sends.
