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

  /** The message to show after a query succeeded or went away: `current` unless nothing holds it. */
  afterRelease(current: string | null): string | null {
    if (current === null) {
      return null;
    }

    for (const message of this.held.values()) {
      if (message === current) {
        return current;
      }
    }

    return null;
  }
}
