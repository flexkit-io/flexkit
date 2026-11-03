import chalk from 'chalk';
import open from 'open';
import type Client from '../../util/client';
import { runCommandGroup, type Subcommand } from '../../util/command-group';
import { isAPIError } from '../../util/error-utils';
import { getCommandName } from '../../util/pkg';
import { printJson, printTable } from '../../util/output/format';
import { dashboardOrigin, findTeamId } from '../mcp/team';
import { usageCommand } from './command';
import { usagePageUrl } from './links';
import { buildUsageRows, formatAmount, monthRange, type UsageLimits, type UsageOverview, type UsageRow } from './rows';

function formatPercent(row: UsageRow): string {
  if (row.percent === null) {
    return chalk.dim('–');
  }

  const text = `${row.percent}%`;

  if (row.percent >= 100) {
    return chalk.red(text);
  }

  return row.percent >= 80 ? chalk.yellow(text) : text;
}

const show: Subcommand = {
  command: { ...usageCommand, name: 'show' },
  needsProject: true,
  flags: { '--team': Boolean, '--month': String, '--open': Boolean, '-o': '--open' },
  async run(ctx) {
    const { client, projectId } = ctx;
    const team = Boolean(ctx.flags['--team']);
    const { startDate, endDate } = monthRange(ctx.flags['--month'] as string | undefined);
    const teamId = team || ctx.flags['--open'] ? await findTeamId(client, projectId) : null;

    if ((team || ctx.flags['--open']) && !teamId) {
      client.output.error(
        `Project ${projectId} is not one of your projects. Check the id with ${getCommandName('project ls')}.`
      );

      return 1;
    }

    const scope: Record<string, string> = team && teamId ? { teamId } : { projectId };
    const query = new URLSearchParams({ ...scope, startDate, endDate }).toString();
    let overview: UsageOverview;
    let limits: UsageLimits;

    try {
      client.output.spinner('Loading usage');
      [overview, limits] = await Promise.all([
        client.fetch<UsageOverview>(`/api/usage/overview?${query}`),
        client.fetch<UsageLimits>(`/api/usage/limits?${new URLSearchParams(scope).toString()}`),
      ]);
    } catch (err: unknown) {
      client.output.stopSpinner();

      if (isAPIError(err) && err.status === 401) {
        client.output.error(`Usage is shown to people, not API tokens. Run ${getCommandName('login')} and try again.`);

        return 1;
      }

      throw err;
    }

    client.output.stopSpinner();
    const rows = buildUsageRows(overview, limits, team);

    if (ctx.json) {
      printJson(client, {
        ...scope,
        planName: overview.planName ?? null,
        period: { startDate, endDate },
        metrics: rows,
      });
    } else {
      const label = team ? `team ${teamId}` : `project ${projectId}`;
      client.output.log(
        `Usage of ${label} from ${startDate.slice(0, 10)} to ${endDate.slice(0, 10)}${
          overview.planName ? ` · ${overview.planName} plan` : ''
        }`
      );
      printTable(
        client,
        ['Metric', 'Used', 'Included', '%'],
        rows.map((entry) => [
          entry.name,
          formatAmount(entry.used, entry.unit),
          entry.limit === null ? chalk.dim('–') : formatAmount(entry.limit, entry.unit),
          formatPercent(entry),
        ])
      );
    }

    if (ctx.flags['--open'] && teamId) {
      const url = usagePageUrl(dashboardOrigin(client.apiUrl), teamId, team ? undefined : projectId);

      try {
        await open(url);
      } catch {
        client.output.log(`Open the Usage page yourself: ${url}`);
      }
    }

    return 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, { command: usageCommand, subcommands: [show], defaultSubcommand: 'show' });
}
