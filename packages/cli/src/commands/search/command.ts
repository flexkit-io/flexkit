import type { Command } from '../help';

export const searchCommand: Command = {
  name: 'search',
  description:
    "Search the project's records by text, across every entity or only the ones you name. Matches the searchable attributes of the deployed schema, exact and prefix hits first, then near misses, like the Studio search. Needs a user session from `flexkit login`; project API tokens are not accepted by the search endpoint.",
  arguments: [{ name: 'text', required: true }],
  options: [
    {
      name: 'entity',
      shorthand: 'e',
      type: [String],
      argument: 'NAME',
      description: 'Only search this entity (name or plural); repeatable or comma-separated (default: every entity)',
      deprecated: false,
    },
    {
      name: 'limit',
      shorthand: 'n',
      type: Number,
      argument: 'N',
      description: 'Maximum number of results, at most 100 (default: 10)',
      deprecated: false,
    },
    {
      name: 'scope',
      shorthand: null,
      type: String,
      argument: 'SCOPE',
      description: 'Scope of scoped labels to show (default: the default scope)',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the hits as JSON on stdout',
      deprecated: false,
    },
    {
      name: 'project',
      shorthand: 'p',
      type: String,
      argument: 'ID',
      description: 'Project to search (default: linked project)',
      deprecated: false,
    },
  ],
  examples: [
    { name: 'Search every entity', value: 'flexkit search "canvas bag"' },
    { name: 'Search only products and brands', value: 'flexkit search tote --entity products,brands --limit 25' },
    {
      name: 'Open the best match in a script',
      value: `flexkit search BAG-001 -e product --json | jq -r '.[0]._id' | xargs flexkit records get product`,
    },
  ],
};
