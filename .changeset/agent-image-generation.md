---
'@flexkit/agent-protocol': patch
'@flexkit/studio': patch
'@flexkit/cli': patch
---

The Flexkit Agent can create images. Ask for one in the chat, or choose **Create image** in the composer's **+** menu to make sure the next message produces one. The image chip in the composer picks the image model (GPT Image, Seedream or Nano Banana; GPT Image by default) and the aspect ratio. Each image shows in the chat with actions to download it, copy it, open it full size, edit it, try it again with another model, or save it to the project's assets.

`@flexkit/agent-protocol` adds the `generated-image` data part, the `AGENT_IMAGE_MODELS` catalog and `agentImageRequestSchema` for the optional `imageGeneration` field of a chat message. Studios older than this release show a generated image as an unknown part.

`flexkit chat` prints a link to each image the agent creates.
