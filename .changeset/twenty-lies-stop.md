---
'@flexkit/cli': patch
---

Fix config loading in React 19 apps when running CLI commands.

The CLI config bundler no longer injects a top-level `React` identifier that could conflict with bundled code (`Identifier 'React' has already been declared`), and now externalizes React/ReactDOM runtime entrypoints (`react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `react-dom/server`, `react-dom/test-utils`) to avoid mixed React runtime internals (`ReactCurrentDispatcher` errors).
