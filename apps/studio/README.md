# Hosted Flexkit Studio

The Studio that runs at Flexkit's own address. It is `@flexkit/studio` in **hosted mode** (no `projectIds`): users sign in once, the Studio lists every project they can access and remembers the one they used last. The only server code is the framework BFF route, the same one self-hosters mount.

## Develop

```bash
pnpm --filter studio dev   # http://localhost:3003
```

Point `FLEXKIT_DOMAIN` at `flexkit.test` to use a local backend. The backend must list this origin in `STUDIO_HOSTED_ORIGINS` (defaults to `http://localhost:3003` in its `.env.local`) so the OAuth login accepts it without a project id. Email login works without that.

For day-to-day Studio development keep using `apps/next-16`, which passes explicit `projectIds` and mounts custom tools.

## Deploy

Vercel project `flexkit-studio` (Root Directory `apps/studio`). Production is deployed **only when packages are published**: the `Release` workflow runs `vercel build` + `vercel deploy --prebuilt --prod` after a successful `changeset publish`, so the hosted Studio always matches the versions on npm. Git pushes never build production (Ignored Build Step below); pull requests still get preview deployments.

Vercel settings to keep in sync with this README:

- Root Directory: `apps/studio`; Build Command: `cd ../.. && pnpm turbo run build --filter=studio...`
- Ignored Build Step: `if [ "$VERCEL_ENV" = "production" ]; then exit 0; else exit 1; fi`
- Environment: `FLEXKIT_DOMAIN=flexkit.io`
- Domain: `flexkit.app`
- GitHub secret `VERCEL_TOKEN` for the release workflow (`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are set in the workflow).

Backend: `STUDIO_HOSTED_ORIGINS=https://flexkit.app` on the Flexkit web project.
