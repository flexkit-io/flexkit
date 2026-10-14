# @flexkit/tools

Custom tools and code skills for Flexkit, defined in your repository and served from your own server. The package has no React or Studio dependency: it works wherever a `Request` → `Response` function can run.

- `defineTool`, `defineSkill` and `defineTools` author the `flexkit.tools.ts` file.
- `createToolsHandler` serves the signed discovery (`GET`) and invocation (`POST`) endpoint that Flexkit calls.
- `@flexkit/tools/dev` exposes `startDevConnect`, the local runtime behind `flexkit dev`.

```ts
// flexkit.tools.ts
import { defineSkill, defineTool, defineTools } from '@flexkit/tools';
import { z } from 'zod';

export const ping = defineTool({
  name: 'ping',
  description: 'Echo a message from the customer app runtime.',
  input: z.object({ message: z.string() }),
  execute: async ({ message }, actor) => ({ actor, echo: message }),
});

export default defineTools({
  tools: [ping],
  skills: [defineSkill({ name: 'Forecasting', description: 'When to forecast.', content: '# Forecasting …' })],
});
```

```ts
// app/api/flexkit/tools/route.ts (Next.js)
import { createToolsHandler } from '@flexkit/tools';
import tools from '../../../../flexkit.tools';

export const runtime = 'nodejs';

const handler = createToolsHandler(tools); // reads FLEXKIT_TOOLS_SECRET

export { handler as GET, handler as POST };
```

Then register the URL with `flexkit tools sync --origin https://app.example.com/api/flexkit/tools` (or in the Dashboard) and run `flexkit dev` while developing. Full docs: https://flexkit.io/docs/automations/custom-tools
