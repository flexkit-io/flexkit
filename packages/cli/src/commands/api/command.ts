import type { Command } from '../help';

export const apiCommand: Command = {
  name: 'api',
  description:
    'Send an authenticated request to the Flexkit API and print the response. Paths that start with /api/ go to the account API (projects, usage); every other path goes to the project API of the selected project (for example /automations or /graphql). Use it for any endpoint that has no dedicated command yet.',
  arguments: [
    {
      name: 'path',
      required: true,
    },
  ],
  options: [
    {
      name: 'method',
      shorthand: 'X',
      type: String,
      argument: 'METHOD',
      description: 'HTTP method (default: GET, or POST when --data is given)',
      deprecated: false,
    },
    {
      name: 'data',
      shorthand: null,
      type: String,
      argument: 'BODY',
      description: 'Request body: inline JSON, @file, or - to read stdin',
      deprecated: false,
    },
    {
      name: 'field',
      shorthand: 'F',
      type: [String],
      argument: 'KEY=VALUE',
      description: 'Add a JSON body field; values are parsed as JSON when possible, @file reads a file (repeatable)',
      deprecated: false,
    },
    {
      name: 'query',
      shorthand: 'q',
      type: [String],
      argument: 'KEY=VALUE',
      description: 'Add a query string parameter (repeatable)',
      deprecated: false,
    },
    {
      name: 'header',
      shorthand: 'H',
      type: [String],
      argument: 'NAME:VALUE',
      description: 'Add a request header (repeatable)',
      deprecated: false,
    },
    {
      name: 'include',
      shorthand: 'i',
      type: Boolean,
      description: 'Print the response status and headers before the body',
      deprecated: false,
    },
    {
      name: 'project',
      shorthand: 'p',
      type: String,
      argument: 'ID',
      description: 'Project for project API paths (default: linked project)',
      deprecated: false,
    },
  ],
  examples: [
    {
      name: 'List the automations of the linked project',
      value: 'flexkit api /automations',
    },
    {
      name: 'List projects of a team through the account API',
      value: 'flexkit api /api/projects -q scope=acme',
    },
    {
      name: 'Create a skill from fields',
      value: "flexkit api /skills -F name=Refunds -F 'description=How we handle refunds' -F content=@refunds.md",
    },
    {
      name: 'Send a JSON body from a file and pipe the result to jq',
      value: 'flexkit api /graphql --data @query.json | jq .data',
    },
    {
      name: 'Delete a resource',
      value: 'flexkit api /skills/skl_123 -X DELETE',
    },
  ],
};
