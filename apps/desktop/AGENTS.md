# Flexkit Studio desktop app (Electron)

Read `README.md` first. Rules for this app:

- It contains no Studio UI. UI and desktop-aware behaviour belong in `packages/flexkit-studio`, behind the `window.flexkitDesktop` bridge (`getDesktop()`); the app only owns native concerns (window, menu, protocol, session, deep links, updates).
- The Studio always loads from `flexkit://app`, in development too. Do not load the Vite URL directly: the session and the origin would differ from production.
- The main process never exposes Node to the renderer: `contextIsolation`, `sandbox` and a typed preload bridge only. Validate every IPC payload in the main process.
- `dependencies` are only what the main process requires at runtime (externals); everything bundled by Vite is a `devDependency`, or electron-builder packages it twice.
- Verify changes with a local package (`dist:dir`), driven with Orca computer-use; the dev app cannot receive `flexkit://` URLs on macOS.
