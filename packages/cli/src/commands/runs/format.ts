import chalk from 'chalk';
import type Client from '../../util/client';
import { formatRelativeTime, formatStatus, printDetails, truncate } from '../../util/output/format';
import type { AutomationRun } from '../automations/types';

/** `83000` → `1m 23s`; '' when either end is missing. */
export function formatDuration(startedAt: string | null | undefined, completedAt: string | null | undefined): string {
  if (!startedAt || !completedAt) {
    return '';
  }

  const ms = Date.parse(completedAt) - Date.parse(startedAt);

  if (!Number.isFinite(ms) || ms < 0) {
    return '';
  }

  const seconds = Math.round(ms / 1000);

  if (seconds < 60) {
    return `${seconds.toString()}s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes.toString()}m ${(seconds % 60).toString()}s`;
  }

  return `${Math.floor(minutes / 60).toString()}h ${(minutes % 60).toString()}m`;
}

/** `1536` → `1.5 KB`. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) {
    return `${Math.max(0, Math.round(bytes || 0)).toString()} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit] ?? 'GB'}`;
}

export function runTableRow(run: AutomationRun, withAutomation: boolean): string[] {
  return [
    run.id,
    ...(withAutomation ? [truncate(run.automationName ?? run.automationId, 32)] : []),
    formatStatus(run.status),
    run.triggerType,
    formatRelativeTime(run.startedAt),
    formatDuration(run.startedAt, run.completedAt) || (run.completedAt ? '' : chalk.dim('—')),
  ];
}

export function printRunDetails(client: Client, run: AutomationRun): void {
  printDetails(client, [
    ['ID', run.id],
    ['Automation', run.automationName ? `${run.automationName} (${run.automationId})` : run.automationId],
    ['Status', formatStatus(run.status)],
    ['Trigger', run.triggerType],
    ['Started', run.startedAt ? `${run.startedAt} (${formatRelativeTime(run.startedAt)})` : ''],
    ['Completed', run.completedAt ?? ''],
    ['Duration', formatDuration(run.startedAt, run.completedAt)],
    ['Workflow run', run.workflowRunId],
  ]);

  if (run.summary) {
    client.output.print(`${chalk.dim('Summary')}\n${run.summary}\n\n`);
  }

  if (run.error) {
    client.output.print(`${chalk.red('Error')}\n${run.error}\n\n`);
  }
}

/** Exit code for a finished run: 1 when it failed or was cancelled. */
export function runExitCode(run: AutomationRun): number {
  return run.status === 'failed' || run.status === 'cancelled' ? 1 : 0;
}

/** A one-line outcome after following or waiting for a run. */
export function printRunOutcome(client: Client, run: AutomationRun): void {
  const { output } = client;

  if (run.status === 'success') {
    output.success(
      `Run ${run.id} succeeded${run.completedAt ? ` in ${formatDuration(run.startedAt, run.completedAt)}` : ''}.`
    );
  } else if (run.status === 'awaiting_approval') {
    output.log(
      `Run ${run.id} is waiting for approval. See ${chalk.cyan(`flexkit approvals ls --run ${run.id}`)}, or pass --follow to keep waiting.`
    );
  } else if (run.status === 'running') {
    output.log(`Run ${run.id} is still running.`);
  } else if (run.status === 'skipped') {
    output.warn(`Run ${run.id} was skipped${run.summary ? `: ${run.summary}` : '.'}`);
  } else {
    output.error(`Run ${run.id} ${run.status}${run.error ? `: ${run.error}` : '.'}`);
  }
}
