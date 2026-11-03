import type { Command } from '../help';

export const usageCommand: Command = {
  name: 'usage',
  description:
    'Show the usage of the project (or its team) in a billing month next to what the plan includes: API requests, database size, asset storage, records, webhooks, members and AI usage (chat turns, automation runs, agent steps). Usage is shown to people, so it needs your `flexkit login` session, not an API token.',
  arguments: [],
  options: [
    {
      name: 'team',
      shorthand: null,
      type: Boolean,
      description: "Show the usage of the project's whole team instead of the project",
      deprecated: false,
    },
    {
      name: 'month',
      shorthand: null,
      type: String,
      argument: 'YYYY-MM',
      description: 'Billing month to show (default: the current UTC month)',
      deprecated: false,
    },
    {
      name: 'open',
      shorthand: 'o',
      type: Boolean,
      description: 'Also open the Usage page of the Dashboard, with the charts',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the metrics, plan and period as JSON',
      deprecated: false,
    },
    {
      name: 'project',
      shorthand: 'p',
      type: String,
      argument: 'ID',
      description: 'Project to use (default: linked project)',
      deprecated: false,
    },
  ],
  examples: [
    { name: "Show this month's usage of the linked project", value: 'flexkit usage' },
    { name: "Show the whole team's usage last month", value: 'flexkit usage --team --month 2026-10' },
    {
      name: 'Print the metrics that are above 80% of their limit',
      value: "flexkit usage --json | jq '.metrics[] | select(.percent >= 80)'",
    },
    { name: 'Open the Dashboard Usage page with the charts', value: 'flexkit usage --open' },
  ],
};
