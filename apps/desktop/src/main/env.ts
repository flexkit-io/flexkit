// Imported first by the main entry: `@flexkit/studio` reads the Flexkit domain
// from `process.env` when its modules are evaluated, so the build-time value
// has to be in the environment before anything else loads.
process.env.FLEXKIT_DOMAIN = __FLEXKIT_DOMAIN__;
