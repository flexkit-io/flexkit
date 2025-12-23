type DebugLogger = ((...args: unknown[]) => void) & {
  enabled?: boolean;
};

function createNoopLogger(): DebugLogger {
  const logger: DebugLogger = (() => {
    // no-op
  }) as DebugLogger;

  logger.enabled = false;

  return logger;
}

export function debug(_namespace?: string): DebugLogger {
  return createNoopLogger();
}

export default debug;
