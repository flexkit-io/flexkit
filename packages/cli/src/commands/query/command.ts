import type { Command } from '../help';

export const queryCommand: Command = {
  name: 'query',
  description:
    "Run a GraphQL query or mutation against the project's GraphQL API and print the JSON result on stdout. The operation can be inline text, a .graphql file, or - to read it from stdin. GraphQL errors are printed on stderr and make the command exit with code 1.",
  arguments: [
    {
      name: 'operation|file|-',
      required: true,
    },
  ],
  options: [
    {
      name: 'var',
      shorthand: null,
      type: [String],
      argument: 'KEY=VALUE',
      description: 'Set a variable; values are parsed as JSON when possible (repeatable)',
      deprecated: false,
    },
    {
      name: 'variables',
      shorthand: null,
      type: String,
      argument: 'JSON',
      description: 'All variables as a JSON object, @file, or - for stdin',
      deprecated: false,
    },
    {
      name: 'data-only',
      shorthand: null,
      type: Boolean,
      description: 'Print only the `data` object instead of the full response',
      deprecated: false,
    },
    {
      name: 'project',
      shorthand: 'p',
      type: String,
      argument: 'ID',
      description: 'Project to query (default: linked project)',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'Query the first five products',
      value: "flexkit query '{ products(limit: 5) { _id sku name { default } } }'",
    },
    {
      name: 'Run a query from a file with variables',
      value: 'flexkit query ./queries/orders-by-status.graphql --var status=PAID --var limit=20',
    },
    {
      name: 'Run a mutation with variables from a JSON file',
      value: 'flexkit query ./mutations/update-price.graphql --variables @vars.json',
    },
    {
      name: 'Pipe an operation in and extract the data with jq',
      value: "cat query.graphql | flexkit query - --data-only | jq '.products[].name'",
    },
  ],
};
