/**
 * The Schema mismatch banner is one message shared by every query on the
 * page, and apps stay mounted off-screen. Each failing query holds the
 * message it raised here. A query that succeeds clears the banner only when
 * no failing query still holds it: if any success cleared it, a query that
 * still fails raised it again on the next render, and the two took turns
 * until React gave up (minified error #185).
 */
export class SchemaErrorHolders {
  private readonly held = new Map<symbol, string>();

  hold(holder: symbol, message: string): void {
    this.held.set(holder, message);
  }

  release(holder: symbol): void {
    this.held.delete(holder);
  }

  /**
   * The message to show after a query succeeded or went away: `current` while
   * a failing query holds it, otherwise a message another failing query still
   * holds (the one on screen may have come from a query that recovered, or
   * from a failed mutation), and nothing once no query fails.
   */
  afterRelease(current: string | null): string | null {
    let fallback: string | null = null;

    for (const message of this.held.values()) {
      if (message === current) {
        return current;
      }

      fallback ??= message;
    }

    return fallback;
  }
}
