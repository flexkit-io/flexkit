---
'@flexkit/cli': patch
---

Add commands for most of what the Flexkit API offers, each with help, examples and a docs page:

- `link` and `unlink` save the project of a folder in `.flexkit/project.json`, so commands no longer need `--project`.
- `schema` pulls, shows and diffs the deployed schema; `schema diff --exit-code` and `--fail-on-breaking` work in CI.
- `deployments` lists, inspects and replays schema deployments.
- `records` lists, reads, counts, creates, updates and deletes records without writing GraphQL; `search` searches them; `query` runs any GraphQL operation.
- `chat` talks to the Chat Agent, interactively or with a prompt, and lists, shows, renames, stops and deletes chats.
- `automations`, `runs` and `approvals` create, edit and run automations, follow run logs, download transcripts and artifacts, and approve or deny changes.
- `skills` manages skills and syncs them with a folder of Markdown files (`pull`, `push`).
- `knowledge` uploads, searches, downloads and links knowledge documents.
- `plugins` installs and connects plugins; `mcp` prints the project's MCP URL and installs it in Claude Code, Cursor, VS Code or Windsurf.
- `activity` reads the activity inbox; `usage` shows usage against the plan limits.
- `api` sends an authenticated request to any API endpoint.

Commands that read data print JSON on stdout with `--json`, destructive commands take `--yes`, and `FLEXKIT_TOKEN`, `FLEXKIT_PROJECT_ID` and `FLEXKIT_API_URL` configure the CLI in CI. `flexkit project` reaches the account API again.
