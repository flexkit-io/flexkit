import { defineTool } from '@flexkit/studio/tools';
import { z } from 'zod';

export const ping = defineTool({
  name: 'ping',
  description: 'Echo a message from the customer app runtime. Use this to verify that custom tools are connected.',
  input: z.object({
    message: z.string().describe('Message to echo back from the Next.js app.'),
  }),
  execute: async ({ message }, actor) => {
    return {
      actor,
      echo: message,
      now: new Date().toISOString(),
      runtime: 'next-16',
    };
  },
});
