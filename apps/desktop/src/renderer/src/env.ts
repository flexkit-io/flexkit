// Imported first by the renderer entry: `@flexkit/studio` reads the Flexkit
// domain from `process.env` when its modules are evaluated, and a browser
// has no `process`.
(globalThis as { process?: { env: { [key: string]: string } } }).process ??= { env: {} };
(globalThis as unknown as { process: { env: { [key: string]: string } } }).process.env.FLEXKIT_DOMAIN = __FLEXKIT_DOMAIN__;
