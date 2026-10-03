# @flexkit/agent-protocol

Schemas and types shared between the Flexkit agent platform and the Studio UI (`@flexkit/ai`):

- `dataPartSchema`: the custom `data-*` parts the platform streams while a chat turn or automation run executes, as zod schemas. The server validates what it writes against them; the UI derives its part types from them.
- Run, approval and chat DTO types returned by the automations and agent chat APIs.

Adding a part: add it here first (minor bump), publish, then emit it on the server and render it in the UI. The UI ignores unknown parts, so publishing ahead of the server is safe.
