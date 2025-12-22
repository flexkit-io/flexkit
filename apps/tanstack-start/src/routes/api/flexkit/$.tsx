import { createFileRoute } from '@tanstack/react-router';
import { createFlexkitFetchHandler } from '@flexkit/studio/tanstack-start';

const flexkitHandler = createFlexkitFetchHandler();

export const Route = createFileRoute('/api/flexkit/$')({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }) => {
        return flexkitHandler(request);
      },
      POST: async ({ request }) => {
        return flexkitHandler(request);
      },
      PUT: async ({ request }) => {
        return flexkitHandler(request);
      },
      PATCH: async ({ request }) => {
        return flexkitHandler(request);
      },
      DELETE: async ({ request }) => {
        return flexkitHandler(request);
      },
    },
  },
});
