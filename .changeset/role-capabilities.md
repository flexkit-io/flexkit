---
'@flexkit/studio': patch
'@flexkit/cli': patch
---

Project roles now form a ladder for content, and the Studio and CLI follow it: Viewers read; Contributors create and edit records, link related records and upload assets; Editors also delete records and manage Knowledge documents; Developers and Owners also set up the project.

**Studio**

- Delete actions (rows and bulk delete in Desk, assets and tags in the asset manager) are shown only to members who may delete, so Contributors no longer see a Delete button the server refuses.
- Adding, renaming, moving, re-indexing, removing and linking Knowledge documents is offered to Editors, Developers and Owners. Contributors and Viewers keep the read view.
- When the server refuses an action because of your role or spaces, you now see its explanation as an error message (for example "Your role (Contributor) cannot delete records. Ask a project owner for the Editor role.") instead of a red "Schema mismatch" banner that also hid the table. A delete that fails now always closes cleanly and says so.
- Your avatar in the top bar shows your initial when you have no picture: the first letter of your name, or of your email address if you gave no name.
- New exports for custom apps: `useCanDeleteRecords`, `useCanManageKnowledge`, `useCapabilities`, `resolveCapabilities` and the `Capabilities` type. `useCanMutate` and `canMutateData` are unchanged.

The Studio reads what a role may do from the backend. With an older or self-hosted backend that does not report it yet, the Studio offers every member the same actions as before. Two small changes apply everywhere: Viewers no longer see the bulk Delete in Desk and the asset Delete as disabled buttons, they are hidden; and a delete that fails closes its dialog and says so.

**CLI**

- `flexkit members` and `flexkit tokens create` list the roles in ladder order (viewer, contributor, editor, developer, owner) and their help says what each role may do. `flexkit members ls` lists editors above contributors, in the table and with `--json`.
- The help of `flexkit project pause` and `flexkit project unpause` says that owners and developers can pause and unpause a project.

No commands, flags or output shapes changed.
