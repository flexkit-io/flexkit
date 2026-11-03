/** `GET /api/usage/overview`: usage in the period (capacity metrics in GB). */
export interface UsageOverview {
  apiRequests?: number;
  databaseSize?: number;
  storage?: number;
  nodes?: number;
  webhooks?: number;
  projectUsers?: number;
  planName?: string | null;
  agentUsage?: {
    agentAutomationRuns?: number;
    agentChatTurns?: number;
    agentSteps?: number;
  } | null;
  period?: { startDate: string; endDate: string };
}

/** `GET /api/usage/limits`: what the plan includes. */
export interface UsageLimits {
  apiRequests?: number;
  databaseSize?: number;
  storage?: number;
  nodes?: number;
  webhooks?: number;
  projectUsers?: number;
  agentChatTurns?: number;
  agentAutomationRuns?: number;
  agentSteps?: number;
  knowledgeSources?: number;
}

export interface UsageRow {
  metric: string;
  name: string;
  used: number;
  limit: number | null;
  unit?: string;
  /** Share of the limit used, in percent; null without a limit. */
  percent: number | null;
}

function row(
  metric: string,
  name: string,
  used: number | undefined,
  limit: number | undefined,
  unit?: string
): UsageRow {
  const value = used ?? 0;
  const max = typeof limit === 'number' && limit > 0 ? limit : null;

  return {
    metric,
    name,
    used: value,
    limit: max,
    ...(unit ? { unit } : {}),
    percent: max === null ? null : Math.round((value / max) * 1000) / 10,
  };
}

/** The metrics the Dashboard overview shows, in the same order. */
export function buildUsageRows(overview: UsageOverview, limits: UsageLimits, team: boolean): UsageRow[] {
  const rows = [
    row('apiRequests', 'API requests', overview.apiRequests, limits.apiRequests),
    row('databaseSize', 'Database size', overview.databaseSize, limits.databaseSize, 'GB'),
    row('storage', 'Asset storage', overview.storage, limits.storage, 'GB'),
    row('nodes', 'Records (nodes)', overview.nodes, limits.nodes),
    row('webhooks', 'Webhooks', overview.webhooks, limits.webhooks),
  ];

  if (!team && overview.projectUsers !== undefined) {
    rows.push(row('projectUsers', 'Project members', overview.projectUsers, limits.projectUsers));
  }

  if (overview.agentUsage) {
    rows.push(
      row('agentChatTurns', 'Chat turns', overview.agentUsage.agentChatTurns, limits.agentChatTurns),
      row(
        'agentAutomationRuns',
        'Automation runs',
        overview.agentUsage.agentAutomationRuns,
        limits.agentAutomationRuns
      ),
      row('agentSteps', 'Agent steps', overview.agentUsage.agentSteps, limits.agentSteps)
    );
  }

  return rows;
}

/** `1234567` → `1,234,567`; GB values keep up to two decimals. */
export function formatAmount(value: number, unit?: string): string {
  const formatted =
    unit === 'GB'
      ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : Math.round(value).toLocaleString('en-US');

  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * The billing month to report: the current UTC month, or `YYYY-MM`. The end
 * is now for the current month and the month's end otherwise.
 */
export function monthRange(month: string | undefined, now = new Date()): { startDate: string; endDate: string } {
  if (month !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`Expected --month as YYYY-MM, got "${month}".`);
  }

  const [year, monthIndex] = month
    ? [Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1]
    : [now.getUTCFullYear(), now.getUTCMonth()];
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1));
  const end = nextMonth.getTime() > now.getTime() ? now : new Date(nextMonth.getTime() - 1);

  if (start.getTime() > now.getTime()) {
    throw new Error(`--month ${month} is in the future.`);
  }

  return { startDate: start.toISOString(), endDate: end.toISOString() };
}
