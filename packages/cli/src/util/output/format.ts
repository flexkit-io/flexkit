import chalk from 'chalk';
import type Client from '../client';
import Table from 'cli-table3';
import table, { noBorderChars } from './table';

/**
 * Writes machine-readable output to stdout. Human output (logs, tables,
 * spinners) goes to stderr, so `--json` results can be piped to `jq` safely.
 */
export function printJson(client: Client, value: unknown): void {
  client.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/** Prints a table with a dimmed header row, or `emptyMessage` when there are no rows. */
export function printTable(client: Client, header: string[], rows: string[][], emptyMessage = 'Nothing found.'): void {
  if (rows.length === 0) {
    client.output.log(emptyMessage);

    return;
  }

  client.output.print(`${table([header.map((cell) => chalk.dim(cell)), ...rows])}\n`);
}

/**
 * Prints `label  value` pairs, skipping empty values. Long values wrap at the
 * terminal width instead of widening every row.
 */
export function printDetails(client: Client, pairs: [string, string | number | boolean | null | undefined][]): void {
  const rows = pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => [label, String(value)]);

  if (rows.length === 0) {
    return;
  }

  const labelWidth = Math.max(...rows.map(([label]) => label.length)) + 2;
  const columns = client.stderr.columns || 100;
  const valueWidth = Math.max(20, columns - labelWidth - 2);
  const details = new Table({
    chars: noBorderChars,
    colWidths: [labelWidth, valueWidth],
    style: { 'padding-left': 0, 'padding-right': 0, head: [], border: [] },
    wordWrap: true,
  });

  details.push(...rows.map(([label, value]) => [chalk.dim(label), value]));
  client.output.print(`${details.toString()}\n`);
}

/** `2026-11-03T10:00:00Z` → `3h ago` (or the date when older than a month). */
export function formatRelativeTime(value: string | number | null | undefined, now = Date.now()): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const time = typeof value === 'number' ? value : Date.parse(value);

  if (Number.isNaN(time)) {
    return String(value);
  }

  const seconds = Math.round((now - time) / 1000);
  const future = seconds < 0;
  const abs = Math.abs(seconds);
  const suffix = (text: string): string => (future ? `in ${text}` : `${text} ago`);

  if (abs < 60) {
    return future ? 'in a moment' : 'just now';
  }

  if (abs < 3600) {
    return suffix(`${Math.floor(abs / 60)}m`);
  }

  if (abs < 86400) {
    return suffix(`${Math.floor(abs / 3600)}h`);
  }

  if (abs < 30 * 86400) {
    return suffix(`${Math.floor(abs / 86400)}d`);
  }

  return new Date(time).toISOString().slice(0, 10);
}

/** Shortens text to `max` characters with an ellipsis. */
export function truncate(value: string | null | undefined, max = 60): string {
  if (!value) {
    return '';
  }

  const singleLine = value.replace(/\s+/g, ' ').trim();

  return singleLine.length > max ? `${singleLine.slice(0, max - 1)}…` : singleLine;
}

/** Colors a status word: green for success, red for failure, yellow for in-progress states. */
export function formatStatus(status: string | null | undefined): string {
  if (!status) {
    return '';
  }

  const normalized = status.toLowerCase();

  if (
    ['succeeded', 'success', 'completed', 'done', 'ready', 'enabled', 'active', 'approved', 'connected'].includes(
      normalized
    )
  ) {
    return chalk.green(status);
  }

  if (['failed', 'error', 'canceled', 'cancelled', 'rejected', 'denied', 'disabled', 'expired'].includes(normalized)) {
    return chalk.red(status);
  }

  if (
    ['running', 'pending', 'queued', 'waiting', 'in_progress', 'processing', 'awaiting_approval'].includes(normalized)
  ) {
    return chalk.yellow(status);
  }

  if (['skipped', 'paused', 'archived'].includes(normalized)) {
    return chalk.dim(status);
  }

  return status;
}
