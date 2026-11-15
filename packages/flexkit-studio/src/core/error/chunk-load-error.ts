/**
 * A chunk load error means the page runs an older build of the Studio than
 * the server now serves: the Studio was deployed again while the tab was open,
 * and a lazily loaded app (or route) asks for a chunk the new deployment no
 * longer has. Reloading the page picks up the new build.
 */

/** The messages bundlers and browsers use when a lazily loaded chunk cannot be fetched. */
const CHUNK_LOAD_MESSAGES = [
  // Turbopack: "Failed to load chunk /_next/static/chunks/….js from module 64072"
  /Failed to load chunk\s/i,
  // Webpack: "Loading chunk 123 failed." / "Loading CSS chunk 123 failed."
  /Loading (CSS )?chunk [^\s]+ failed/i,
  // Native dynamic import(): Chrome, Firefox and Safari.
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  // Vite.
  /Unable to preload CSS/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const { message, name } = error as { message?: unknown; name?: unknown };

  if (name === 'ChunkLoadError') {
    return true;
  }

  return typeof message === 'string' && CHUNK_LOAD_MESSAGES.some((pattern) => pattern.test(message));
}
