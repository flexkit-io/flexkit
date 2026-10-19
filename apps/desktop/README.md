# Flexkit Studio for desktop

The downloadable Studio for macOS and Windows. It is `@flexkit/studio` in **hosted mode**, the same Studio that runs at [flexkit.app](https://flexkit.app), inside Electron. The app contains no Studio UI code of its own: it consumes the package from the workspace, so every Studio change ships to the desktop with the next release.

## How it works

- **The Studio loads from the app's own scheme**, `flexkit://app`, not from a server. The main process serves the built renderer (`src/main/protocol.ts`) and answers the Studio's `/api/flexkit/*` calls with `@flexkit/studio/electron`, the same BFF core the Next.js, Astro and TanStack Start adapters wrap. The Flexkit session lives in the OS keychain (`safeStorage`, `src/main/session-store.ts`) instead of an HttpOnly cookie.
- **Sign-in happens in the system browser.** The Studio opens the provider with `flexkit://auth/callback` as the callback; after the OAuth round trip the Flexkit backend hands the one-time code to that URL, the OS opens the app with it (`src/main/deep-link.ts`) and the main process exchanges it for a session. Email (OTP) sign-in works inside the app. Only the backend's allowlist knows this callback, so a self-hosted Flexkit cannot use the desktop app.
- **Desktop behaviour reaches the Studio through one bridge**, `window.flexkitDesktop` (`src/preload/index.ts`, typed as `FlexkitDesktopBridge` in `@flexkit/studio`): dock badge for Activity, window focus from a notification, paths to open (deep links, menu), downloaded updates. Studio features check for the bridge, never for a platform.
- **Links to `flexkit://app/<path>`** open the Studio at that path, in the running window or a new one.
- Native notifications come from the Studio's Activity poller, which keeps running while the window is closed (macOS keeps the app open). Web Push is not used in the app.
- A provider login leaves for the system browser with a nonce (`state`) the Flexkit backend echoes to `flexkit://auth/callback`; the app exchanges the code only for the login it started (`src/main/login-state.ts`), and the login expires after ten minutes.
- Pages get only the permissions the Studio needs (`src/main/permissions.ts`): notifications, the clipboard and the microphone for dictation. On macOS the microphone also needs the system's consent, which the usage description in `electron-builder.yml` and the audio-input entitlement make possible.
- Updates come from the GitHub release the app was published with (`electron-updater`); they download in the background and the Studio's app bar offers to restart.

## Develop

```bash
pnpm --filter desktop dev                              # against flexkit.io
FLEXKIT_DOMAIN=flexkit.test pnpm --filter desktop dev  # against the local backend
```

`dev` builds the main and preload scripts, starts Vite for the renderer and launches Electron. The window still loads `flexkit://app`; the main process forwards page requests to Vite, so development and production share one code path (session, origin, routing). Builds against `flexkit.test` trust its self-signed certificate and keep their session apart from production's.

The `flexkit://` scheme is only honoured by macOS from a real app bundle, so test sign-in and deep links with a local package:

```bash
FLEXKIT_DOMAIN=flexkit.test pnpm --filter desktop build && pnpm --filter desktop dist:dir
open "dist/mac-arm64/Flexkit Studio.app"
open "flexkit://app/<projectId>/desk"
```

`FLEXKIT_DEBUG_PROTOCOL=1` logs the requests the scheme serves, navigations and deep links (never the login code).

Studio UI changes are made in `packages/flexkit-studio` as usual (`pnpm --filter @flexkit/studio build` for the running app to pick them up); for day-to-day Studio development keep using `apps/next-16`.

## Release

Installers are built by the `Release` workflow after `changeset publish`, from the same commit as the npm packages and the hosted Studio, and attached to a GitHub release of this repository. The app's version is the `@flexkit/studio` version it bundles (`scripts/build-installers.mjs`), so installers, npm and flexkit.app always line up.

Signing and notarization run when the credentials are present as GitHub secrets, and are skipped otherwise (the app then opens with a Gatekeeper or SmartScreen warning):

- macOS: `CSC_LINK` (base64 `.p12` of the Developer ID Application certificate), `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
- Windows: `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` (Authenticode `.pfx`), or Azure Trusted Signing variables as electron-builder documents them.

Backend: the login callback `flexkit://auth/callback` is allowlisted in the Flexkit web project (`lib/auth/hosted-origins.ts`).
