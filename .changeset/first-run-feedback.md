---
'@flexkit/studio': patch
---

- Desk no longer fails with "must have a selection of subfields" on image and file fields whose schema says `inputType: 'image'` or `'file'` (as schemas written by the agent did); every asset field now uses the asset widget.
- The "Schema mismatch" banner has a Reload button and, for owners and developers, "Ask the agent to fix it", which opens a new chat with the error typed in, ready to send.
- Fixed a page crash (minified React error #185) when one list on the page hit a schema mismatch while another loaded fine.
- A page that crashes now explains what happened and offers "Try again" and "Reload"; the technical message is folded under "Technical details".
- An owner's empty project that did not start in Studio (created in Dashboard or the CLI) now offers the commerce starter in its empty chat.
