---
'@flexkit/studio': patch
---

The agent composer's prompt input now follows the shadcn/ui Input Group and Attachment pattern: a round outlined attach button, a round primary send button with an up arrow, a padded textarea, and a header that lists drafted attachments as removable chips when nothing custom is rendered in it. The `Attachment` primitives are exported from `@flexkit/studio/ui`, and the shadcn config now targets the `new-york-v4` registry style. Every prompt input export keeps its name and props.

A new chat now greets with the composer in the middle of the page, ChatGPT-style, with the intro paragraph removed and the placeholder reading "Ask Flexkit anything about <project>...". The composer moves to the bottom as soon as the first message is sent, and its corners are rounder.
