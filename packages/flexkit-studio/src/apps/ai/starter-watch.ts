import { mutate } from 'swr';
import { isStarterRunning, starterPath, type StarterStatus } from '../../core/config/onboarding';
import { revalidateProjectSchema } from '../../core/config/use-project-schemas';

const POLL_INTERVAL_MS = 2_000;
/** About ten minutes; a starter usually finishes in two. */
const POLL_LIMIT = 300;
const watching = new Set<string>();

/** `null` = transient failure (keep polling). */
export type StarterFetcher = () => Promise<StarterStatus | null | 'missing'>;

async function fetchStarter(projectId: string): Promise<StarterStatus | null | 'missing'> {
  const response = await fetch(starterPath(projectId), { credentials: 'include' });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as { starter?: StarterStatus | null };

  return body.starter ?? 'missing';
}

/** The schema is live once the starter got past its deploy. */
export function starterSchemaDeployed(status: StarterStatus): boolean {
  return status.state === 'seeding' || status.state === 'completed';
}

/**
 * Follows a running starter until it settles, independently of which
 * component started it and of navigation inside the Studio. Shares its
 * results through the SWR cache of `starterPath`, and reloads the project
 * schema once, as soon as the starter's schema is deployed.
 */
export function watchStarter({
  fetchStatus,
  projectId,
  publish = (status) => mutate(starterPath(projectId), { starter: status }, { revalidate: false }),
  revalidate = revalidateProjectSchema,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
}: {
  fetchStatus?: StarterFetcher;
  projectId: string;
  publish?: (_status: StarterStatus) => Promise<unknown>;
  revalidate?: (_projectId: string) => Promise<unknown>;
  sleep?: (_ms: number) => Promise<void>;
}): void {
  if (watching.has(projectId)) {
    return;
  }

  watching.add(projectId);

  const load = fetchStatus ?? (() => fetchStarter(projectId));

  void (async () => {
    let schemaLoaded = false;

    try {
      for (let attempt = 0; attempt < POLL_LIMIT; attempt += 1) {
        await sleep(POLL_INTERVAL_MS);

        let status: StarterStatus | null | 'missing' = null;

        try {
          status = await load();
        } catch {
          status = null;
        }

        if (status === 'missing') {
          return;
        }

        if (status === null) {
          continue;
        }

        await publish(status);

        if (!schemaLoaded && starterSchemaDeployed(status)) {
          schemaLoaded = true;
          await revalidate(projectId);
        }

        if (!isStarterRunning(status)) {
          return;
        }
      }
    } finally {
      watching.delete(projectId);
    }
  })();
}
