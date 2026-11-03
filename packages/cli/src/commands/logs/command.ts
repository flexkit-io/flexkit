import type { Command, CommandOption } from '../help';

function option(
  name: string,
  type: CommandOption['type'],
  description: string,
  argument?: string,
  shorthand: string | null = null
): CommandOption {
  return { name, shorthand, type, argument, description, deprecated: false };
}

const commonOptions: CommandOption[] = [
  option(
    'since',
    String,
    'Start of the time range: a duration back from now (30m, 1h, 2d, 1w) or an ISO date-time (default: 1h)',
    'TIME',
    's'
  ),
  option('until', String, 'End of the time range, same formats as --since (default: now)', 'TIME'),
  option(
    'before',
    String,
    'Only entries older than this time, for paging (the hint after a full page prints it)',
    'TIME'
  ),
  option('limit', Number, 'Entries to fetch, 1–500 (default: 50)', 'N', 'n'),
  option('follow', Boolean, 'Keep running and print new entries as they arrive (Ctrl+C to stop)', undefined, 'f'),
  option('interval', Number, 'How often --follow polls, in seconds (default: 5, minimum: 2)', 'SECONDS'),
  option('utc', Boolean, 'Print times in UTC instead of local time'),
  option(
    'json',
    Boolean,
    'Print JSON: the page with its entries (newest first) and nextBefore, the --before value for the next page; with --follow, one entry per line, oldest first'
  ),
  option('project', String, 'Project to use (default: linked project)', 'ID', 'p'),
];

export const logsApiCommand: Command = {
  name: 'api',
  description:
    'Show GraphQL API requests made to the project: operation, status code, duration, size and location. Newest entries are printed last.',
  arguments: [],
  options: [
    option('operation', String, 'Only requests with this exact GraphQL operation name', 'NAME'),
    option('status', String, 'Only requests that returned this HTTP status code, such as 500', 'CODE'),
    ...commonOptions,
  ],
  examples: [
    { name: 'API requests from the last hour', value: 'flexkit logs' },
    { name: 'Server errors over the last two days', value: 'flexkit logs api --since 2d --status 500' },
    { name: 'Watch one operation live', value: 'flexkit logs api --operation GetProducts --follow' },
    {
      name: 'Slowest requests of a day, with jq',
      value:
        "flexkit logs api --since 2026-11-02 --until 2026-11-03 --limit 500 --json | jq '.data | sort_by(-.duration_ms) | .[:10]'",
    },
    {
      name: 'The --before value for the next page, in a script',
      value: "flexkit logs api --since 1d --limit 500 --json | jq -r '.nextBefore // empty'",
    },
  ],
};

export const logsWebhooksCommand: Command = {
  name: 'webhooks',
  description:
    'Show webhook deliveries: the event, the HTTP status your endpoint answered, duration, URL and the error of failed deliveries.',
  arguments: [],
  options: [
    option('event', String, 'Only deliveries for this event: create, update or delete', 'EVENT'),
    option('status', String, 'Only succeeded or failed deliveries', 'succeeded|failed'),
    ...commonOptions,
  ],
  examples: [
    { name: 'Failed deliveries today', value: 'flexkit logs webhooks --since 1d --status failed' },
    { name: 'Watch deliveries while you test an endpoint', value: 'flexkit logs webhooks -f' },
    {
      name: 'Count failures by URL',
      value:
        "flexkit logs webhooks --since 1w --status failed --limit 500 --json | jq '.data | group_by(.url) | map({url: .[0].url, failures: length})'",
    },
  ],
};

export const logsLlmCommand: Command = {
  name: 'llm',
  description:
    'Show AI model calls made by the chat agent and automations: model, input and output tokens, cost, duration and the automation that made the call.',
  arguments: [],
  options: commonOptions,
  examples: [
    { name: 'Model calls from the last hour', value: 'flexkit logs llm' },
    {
      name: 'Total cost of the last 7 days (up to 500 calls)',
      value: "flexkit logs llm --since 7d --limit 500 --json | jq '[.data[].actual_cost_micros] | add / 1000000'",
    },
    { name: 'Watch an automation run spend tokens', value: 'flexkit logs llm --follow --interval 2' },
  ],
};

export const logsCommand: Command = {
  name: 'logs',
  description:
    'Read project logs: GraphQL API requests (api, the default), webhook deliveries (webhooks) and AI model calls (llm). Any project member or project API token can read them.',
  arguments: [],
  subcommands: [logsApiCommand, logsWebhooksCommand, logsLlmCommand],
  options: commonOptions,
  examples: [
    { name: 'API requests from the last hour', value: 'flexkit logs' },
    { name: 'Failed webhook deliveries over 2 days', value: 'flexkit logs webhooks --since 2d --status failed' },
    { name: 'Follow AI model calls live', value: 'flexkit logs llm --follow' },
    { name: 'Stream API requests as JSON lines', value: 'flexkit logs api -f --json | jq -c .operation_name' },
  ],
};
