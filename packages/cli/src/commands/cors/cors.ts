/** Pure helpers for `flexkit cors`. */

/** A CORS origin as the API returns it. */
export interface CorsOriginDto {
  id: number;
  origin: string;
  allowCredentials: boolean;
  createdAt: string;
}

/** Trims and drops trailing slashes, as the server does (`https://app.example.com/` → `https://app.example.com`). */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

/** Rejects values the server would refuse, with a hint. Wildcards (`https://*.example.com`, `:*`) are allowed. */
export function checkOrigin(origin: string): string | null {
  if (!/^(\*|https?):\/\/[a-z0-9*.-]+(:(\d{1,5}|\*))?(\/.*)?$/i.test(origin)) {
    return `"${origin}" is not an origin. Include the scheme, for example https://app.example.com or http://localhost:3000.`;
  }

  return null;
}

/** Splits `cors add` arguments into origins to add and origins already in the list (deduplicated). */
export function planCorsAdd(
  existing: CorsOriginDto[],
  values: string[]
): { add: string[]; skipped: CorsOriginDto[]; invalid: string[] } {
  const add: string[] = [];
  const skipped: CorsOriginDto[] = [];
  const invalid: string[] = [];

  for (const value of values) {
    const origin = normalizeOrigin(value);

    if (checkOrigin(origin)) {
      invalid.push(value);
      continue;
    }

    const match = existing.find((entry) => entry.origin.toLowerCase() === origin.toLowerCase());

    if (match) {
      if (!skipped.includes(match)) {
        skipped.push(match);
      }
    } else if (!add.some((entry) => entry.toLowerCase() === origin.toLowerCase())) {
      add.push(origin);
    }
  }

  return { add, skipped, invalid };
}

/** Resolves `cors rm` arguments (numeric ids or origins) to saved origins; unknown values are returned apart. */
export function resolveCorsTargets(
  existing: CorsOriginDto[],
  values: string[]
): { targets: CorsOriginDto[]; unknown: string[] } {
  const targets: CorsOriginDto[] = [];
  const unknown: string[] = [];

  for (const value of values) {
    const normalized = normalizeOrigin(value).toLowerCase();
    const match = /^\d+$/.test(value.trim())
      ? existing.find((entry) => entry.id === Number(value.trim()))
      : existing.find((entry) => entry.origin.toLowerCase() === normalized);

    if (!match) {
      unknown.push(value);
    } else if (!targets.includes(match)) {
      targets.push(match);
    }
  }

  return { targets, unknown };
}
