<div align="center">
  <a href="https://flexkit.io">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://flexkit.io/public/logos/icon-dark-background.png">
      <img alt="Flexkit logo" src="https://flexkit.io/public/logos/icon-light-background.png" height="128">
    </picture>
  </a>
  <h1>Flexkit</h1>

<a href="https://www.npmjs.com/package/@flexkit/studio"><img alt="NPM version" src="https://img.shields.io/npm/v/%40flexkit%2Fstudio?style=for-the-badge&labelColor=%23000000&color=%232563eb"></a>
<a href="https://github.com/flexkit-io/flexkit/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/npm/l/%40flexkit%2Fstudio?style=for-the-badge&labelColor=%23000000&color=%230ccf6a"></a>
<a href="https://github.com/orgs/flexkit-io/discussions"><img alt="Join the community on GitHub" src="https://img.shields.io/badge/Join%20the%20comunity-blue.svg?style=for-the-badge&logo=data:image/svg%2bxml;base64,PHN2ZyBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgNDggNDgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcgOEg0MVY0MEg3VjhaIiBmaWxsPSIjMDIwODE3Ij48L3BhdGg+PHBhdGggZD0iTTI0IDBDNDIgMCA0OCA2IDQ4IDI0QzQ4IDQyIDQyIDQ4IDI0IDQ4QzYgNDggMCA0MiAwIDI0QzAgNiA2IDAgMjQgMFpNMTcuNzQ5NCA5LjUyMzgxSDguNzYxOUwxOS4yODMzIDIzLjgzMTNMOC43NjE5IDM4LjcwNzhIMTcuNzQ5NEwyMS4wNDk5IDMzLjY2MzlWMTQuMjU0OUwxNy43NDk0IDkuNTIzODFaTTM4Ljk1NzcgOS41MjM4MUgyOS45NTQyTDI2LjI4NTcgMTQuODIyOVYzMy4wNDA2TDI5Ljk1NDIgMzguNzA3OEgzOC45NTc3TDI4LjM5MDggMjMuODMxM0wzOC45NTc3IDkuNTIzODFaIiBmaWxsPSJ3aGl0ZSI+PC9wYXRoPjwvc3ZnPg==&labelColor=%23000000"></a>

</div>

**The AI operating system for e-commerce.**

Your data, context, workflows and agents in one system. Flexkit connects the tools you already use, learns how your store works, runs it around the clock and gets smarter with every outcome.

This repository holds the open-source parts of Flexkit: the **Studio** (a React app you can mount inside your own app), the **CLI** and the **SDK** for defining your data model and your own agent tools. They are MIT-licensed. The data backend and the agent are hosted by Flexkit.

[Website](https://flexkit.io) · [Documentation](https://flexkit.io/docs) · [Discussions](https://github.com/orgs/flexkit-io/discussions)

## One system, six layers

Flexkit holds your business data and the context around it. It picks the right model for each task and runs agents across the tools you already use. Your team sets the limits.

| Layer           | What it does                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Data**        | Your products, orders, customers and suppliers as linked records, so agents see how everything connects.            |
| **Context**     | Your documents, written rules and past decisions, so agents cite their sources and work the way your team does.     |
| **Models**      | Models from OpenAI, Anthropic, Google and xAI. Flexkit picks one for each task, or you choose your own.             |
| **Agents**      | Automations that run on a schedule or a trigger, and ask first before changing what you have not allowed.           |
| **Connections** | Plugins from Shopify and Stripe to Slack and Google Workspace, plus access from Claude, ChatGPT and any MCP client. |
| **Control**     | Roles set what each person can do, spaces set what they can see, and every run leaves a transcript to read.         |

## What you get

- **Your business, connected.** Flexkit stores your business as a graph of the records you choose (products, orders, customers, suppliers or anything else) with the relationships between them as first-class data. An agent answers by walking that graph, from a low-stock alert to the open orders it affects to the supplier who can refill it.
- **Keep your systems, connect their data.** Your shop, ERP and CRM stay where they are. Sync what matters to Flexkit through its GraphQL API or a plugin, and Flexkit links it into one record.
- **It learns how your business works.** Drop in supplier PDFs, return policies and price lists, and the agent reads them and cites the passage. Write your rules once as skills, and every chat and automation follows them. What the team keeps agreeing on becomes shared memory.
- **Ask anything, get a real answer.** The agent answers from your own records, querying the live data each time. It charts the result, exports it as a file, and changes records once you approve. When it needs a decision, it asks instead of guessing.
- **Runs your business around the clock.** Anything you would ask twice can run on its own: every morning, when an order comes in, when stock drops, or when another system sends a signal. Results go to Slack or Teams, and changes you have not allowed wait for a yes.
- **The right model for each job.** A quick model for a lookup, a stronger one for a long run. Choose a model yourself for any chat or automation, and switch the day a better one ships.
- **Your team stays in control.** Five built-in roles say what someone may do. Spaces say what they may see, down to a single field, and the same rule holds in tables, in chat, in automations, in the API and in AI clients.

And everything around it:

- **Describe your business, get a data model.** The agent proposes the record types and the links between them; nothing changes until you approve.
- **One record, every market.** Keep a price, a name or a description per market or language, with a default to fall back on.
- **A thousand records in one ask.** Reprice a collection or retag a season. Flexkit counts what will change first and runs it in the background once you approve.
- **Reports you can send.** Ask for a report and get a page or a PDF, with a link that keeps working.
- **Type it, say it or attach it.** Dictate a question, or drop in a photo, a spreadsheet or a supplier's PDF and ask about what is in it.

## Works where you already work

Flexkit runs in the browser, as a desktop app for macOS and Windows, inside your own React app, and inside Claude, ChatGPT, Cursor or any MCP client (signed in with your Flexkit account, with your role and spaces applied).

Plugins connect it to **Shopify, Slack, Microsoft Teams, Notion, Stripe** (preview), **Google Workspace** (preview), **Axiom** and **Tinybird**, so the agent can read and act in the tools your team already uses. Developers can add their own tools from code.

## For developers

- **The data model in code.** Define it in `flexkit.config.ts` and deploy it from the terminal.
- **A GraphQL API for everything,** generated from your data model.
- **Your own tools behind the agent.** Expose server-side functions from your app as tools and code skills.
- **A CLI** for records, queries, automations, skills, knowledge, plugins, logs, tokens and more. See the [CLI README](https://github.com/flexkit-io/flexkit/tree/main/packages/cli).

### Packages

| Package                                                                                              | Description                                                                                                   |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`@flexkit/studio`](https://github.com/flexkit-io/flexkit/tree/main/packages/flexkit-studio)         | The Studio: tables, record editing, chat, automations and the rest of the workspace as a React component.     |
| [`@flexkit/schema`](https://github.com/flexkit-io/flexkit/tree/main/packages/schema)                 | `defineConfig` / `defineEntity` and the serializer that turns `flexkit.config.ts` into the deployable schema. |
| [`@flexkit/tools`](https://github.com/flexkit-io/flexkit/tree/main/packages/tools)                   | Define, serve and run custom tools and code skills from your own server.                                      |
| [`@flexkit/cli`](https://github.com/flexkit-io/flexkit/tree/main/packages/cli)                       | The `flexkit` command-line interface.                                                                         |
| [`@flexkit/agent-protocol`](https://github.com/flexkit-io/flexkit/tree/main/packages/agent-protocol) | Schemas and types shared between the agent platform and the Studio UI.                                        |

The [`apps`](https://github.com/flexkit-io/flexkit/tree/main/apps) folder has the desktop app, the hosted Studio, and example host apps for Next.js, Astro and TanStack Start.

## Getting started

Visit [flexkit.io/docs](https://flexkit.io/docs) for the full documentation.

```shell
npm install --global @flexkit/cli
flexkit login
flexkit link      # link this folder to a project
flexkit deploy    # deploy the schema from flexkit.config.ts
```

### Define your schema

`flexkit.config.ts` is pure data: no React, no JSX. Icons are [Lucide](https://lucide.dev) icon names in PascalCase and validation is a function that receives Zod.

```ts
// flexkit.config.ts
import { defineConfig, defineEntity } from '@flexkit/schema';

const products = defineEntity({
  name: 'product',
  plural: 'products',
  display: 'name',
  menu: { label: 'Products', group: 'catalog', icon: 'Tag' },
  attributes: [
    {
      name: 'name',
      label: 'Name',
      scope: 'local',
      dataType: 'string',
      inputType: 'text',
      searchable: true,
      validation: (z) => z.string().min(1, { error: 'Name is required' }),
      defaultValue: '',
    },
    {
      name: 'stock',
      label: 'Stock',
      scope: 'global',
      dataType: 'int',
      inputType: 'number',
      validation: (z) => z.number().int().min(0),
      defaultValue: 0,
    },
  ],
});

export default defineConfig({
  projectId: 'your-project-id',
  title: 'Atlas Commerce',
  menuGroups: [{ name: 'catalog', title: 'Catalog' }],
  scopes: [{ name: 'default', label: 'Default', isDefault: true }],
  spaces: [{ code: 'mkt', label: 'Marketing' }],
  schema: [products],
});
```

### Mount the Studio

The Studio renders the deployed schema; run `flexkit deploy` after editing `flexkit.config.ts`. The host app never imports the config, it only passes the project ids:

```tsx
import { FlexkitStudio } from '@flexkit/studio';
import '@flexkit/studio/styles.css';

export default function Studio() {
  return <FlexkitStudio projectIds={['your-project-id']} basename="/studio" />;
}
```

`basename` is the path the Studio is mounted under; omit it when the Studio lives at `/`.

### Add custom tools (optional)

Tools and code skills let the Flexkit agent call your own server-side code. Define them in `flexkit.tools.ts` with `@flexkit/tools`, serve them from any HTTPS route with `createToolsHandler`, and run `flexkit dev` while developing. See the [custom tools guide](https://flexkit.io/docs/automations/custom-tools).

```ts
import { defineTool, defineTools } from '@flexkit/tools';
import { z } from 'zod';

export default defineTools({
  tools: [
    defineTool({
      name: 'ping',
      description: 'Echo a message from the app runtime.',
      input: z.object({ message: z.string() }),
      execute: async ({ message }) => ({ echo: message }),
    }),
  ],
});
```

## Security and data

- Business data is hosted in the EU and is never used to train models.
- Credentials for connected tools are encrypted with AES-256-GCM.
- Every proposed change leaves an approval record, every automation run a transcript, and every schema deploy a history entry.
- Export the whole project, records and files, as one archive that re-imports cleanly.

## Contributing

Contributions to Flexkit are welcome and highly appreciated. However, before you jump right into it, we would like you to review our [Contribution Guidelines](/CONTRIBUTING.md) to make sure you have a smooth experience contributing to Flexkit.

## Reporting Issues

Found a bug? Have a feature request?

Open an issue with:
• Repro steps
• Expected vs actual behavior
• Screenshots when helpful
• Schema snippet (if relevant)

## License

This project is licensed under the **MIT license**.

See [LICENSE](https://github.com/flexkit-io/flexkit/blob/main/LICENSE) for more information.

---

## Security

If you believe you have found a security vulnerability in Flexkit, we encourage you to **_responsibly disclose this and NOT open a public issue_**.

See [SECURITY.md](/SECURITY.md) for how to report.
