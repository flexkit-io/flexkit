/**
 * Pure helpers behind the run history events in a replay: the Search Runs
 * card with the past automation runs it found and the Read Run status line.
 * Kept free of React so the labels are unit-tested.
 */
import { uniqueBy } from './past-chat-parts';
import type { ReplayDataParts } from './replay';

export type PastRunResult = NonNullable<ReplayDataParts['run-search']['results']>[number];

/** The run page of an automation in the AI app. */
export function getAutomationRunPath(projectId: string, automationId: string, runId: string): string {
  return `/${encodeURIComponent(projectId)}/ai/automations/${encodeURIComponent(automationId)}/runs/${encodeURIComponent(runId)}`;
}

/** One entry per run in rank order. */
export function uniquePastRuns(results: PastRunResult[] | undefined): PastRunResult[] {
  return uniqueBy(results, (result) => result.runId);
}

export function summarizeRunSearch(query: string, runs: PastRunResult[]): string {
  // Without a query the agent listed the latest runs.
  if (!query.trim()) {
    return runs.length === 0
      ? 'No finished runs yet'
      : `The ${runs.length === 1 ? 'latest run' : `${String(runs.length)} latest runs`}`;
  }

  if (runs.length === 0) {
    return `No past runs matched "${query}"`;
  }

  return `${String(runs.length)} past ${runs.length === 1 ? 'run' : 'runs'} for "${query}"`;
}

const STATUS_LABELS = new Map<string, string>([
  ['cancelled', 'Cancelled'],
  ['failed', 'Failed'],
  ['skipped', 'Skipped'],
  ['success', 'Succeeded'],
]);

export function getRunStatusLabel(status: string): string {
  return STATUS_LABELS.get(status) ?? status;
}
