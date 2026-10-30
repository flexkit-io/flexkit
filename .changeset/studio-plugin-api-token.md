---
'@flexkit/studio': patch
---

Plugins that connect with an API token instead of a sign-in, such as Tinybird, open a form in the Marketplace and in the chat's connect card where you paste the token. Flexkit checks it with the provider before saving it, stores it encrypted and never shows it to the agent; Studio shows only its last four characters. Reconnect replaces the token in place. A chat message that contains a token in the format of a Marketplace plugin is not sent: Studio removes the token from the message and points you to the connect form instead.
