import { revalidateProjectSchema } from '../../core/config/use-project-schemas';
import type { AutomationApproval } from './types';

const POLL_INTERVAL_MS = 5_000;
const POLL_LIMIT = 150;
const watching = new Set<string>();

/** `null` = transient failure (keep polling); `'missing'` = the approval does not exist (stop). */
export type ApprovalFetcher = () => Promise<AutomationApproval | 'missing' | null>;

function urlFetcher(approvalUrl: string): ApprovalFetcher {
  return async () => {
    const response = await fetch(approvalUrl, { credentials: 'include', mode: 'cors' });

    if (response.status === 404) {
      return 'missing';
    }

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as { approval?: AutomationApproval };

    return body.approval ?? 'missing';
  };
}

/**
 * Decides whether a watch is still needed: `true` to keep polling, `false`
 * once the deployment settled (schema refreshed when it succeeded).
 */
export function settleSchemaDeployment(
  approval: AutomationApproval | null,
  projectId: string,
  revalidate: (_projectId: string) => Promise<unknown> = revalidateProjectSchema
): boolean {
  if (!approval || approval.kind !== 'schema' || approval.status !== 'approved' || approval.error) {
    return false;
  }

  if (approval.executedAt) {
    void revalidate(projectId);

    return false;
  }

  return true;
}

/**
 * After a schema change is approved the deployment runs server-side for a
 * while. This keeps polling the approval, independently of which component
 * approved it (chat card or inbox drawer) and of navigation inside the
 * Studio, and refetches the project schema once the deployment completed.
 */
export function watchSchemaDeployment({
  approvalId,
  approvalUrl,
  fetchApproval,
  projectId,
  revalidate = revalidateProjectSchema,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
}: {
  approvalId: string;
  /** GET endpoint returning `{ approval }`; required unless `fetchApproval` is given. */
  approvalUrl?: string;
  fetchApproval?: ApprovalFetcher;
  projectId: string;
  revalidate?: (_projectId: string) => Promise<unknown>;
  sleep?: (_ms: number) => Promise<void>;
}): void {
  const key = `${projectId}:${approvalId}`;
  const load = fetchApproval ?? (approvalUrl ? urlFetcher(approvalUrl) : null);

  if (!load || watching.has(key)) {
    return;
  }

  watching.add(key);

  void (async () => {
    try {
      for (let attempt = 0; attempt < POLL_LIMIT; attempt += 1) {
        let approval: AutomationApproval | 'missing' | null = null;

        try {
          approval = await load();
        } catch {
          approval = null;
        }

        if (approval === 'missing') {
          return;
        }

        // A transient fetch failure (network blip, 5xx) keeps the watch alive.
        if (approval !== null && !settleSchemaDeployment(approval, projectId, revalidate)) {
          return;
        }

        await sleep(POLL_INTERVAL_MS);
      }
    } finally {
      watching.delete(key);
    }
  })();
}
