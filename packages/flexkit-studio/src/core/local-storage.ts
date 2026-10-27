/**
 * The browser's local storage, or null where there is none or touching it
 * throws (server rendering, a sandboxed frame, blocked site data). Callers
 * still wrap each read and write, since storage can fail per call.
 */
export function getLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
