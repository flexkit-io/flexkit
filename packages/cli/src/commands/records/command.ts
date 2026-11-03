import type { Command, CommandOption } from '../help';

const projectOption: CommandOption = {
  name: 'project',
  shorthand: 'p',
  type: String,
  argument: 'ID',
  description: 'Project to use (default: linked project)',
  deprecated: false,
};

const jsonOption: CommandOption = {
  name: 'json',
  shorthand: null,
  type: Boolean,
  description: 'Print the result as JSON on stdout',
  deprecated: false,
};

const scopeOption: CommandOption = {
  name: 'scope',
  shorthand: null,
  type: String,
  argument: 'SCOPE',
  description: 'Scope of locally scoped attributes to show or write (default: the default scope)',
  deprecated: false,
};

const whereOption: CommandOption = {
  name: 'where',
  shorthand: null,
  type: String,
  argument: 'JSON',
  description: 'GraphQL filter (the generated <entity>Where input) as JSON, @file, or - for stdin',
  deprecated: false,
};

const dataOptions: CommandOption[] = [
  {
    name: 'data',
    shorthand: null,
    type: String,
    argument: 'JSON',
    description: 'Attribute values as a JSON object, @file, or - for stdin',
    deprecated: false,
  },
  {
    name: 'set',
    shorthand: null,
    type: [String],
    argument: 'KEY=VALUE',
    description: 'Set one attribute; values are parsed as JSON when possible, name.de=… sets one scope (repeatable)',
    deprecated: false,
  },
  scopeOption,
];

export const recordsListCommand: Command = {
  name: 'ls',
  description:
    'List records of an entity in a table. Pick columns with --fields, filter with --where (the GraphQL where input), and page with --limit and --offset.',
  arguments: [{ name: 'entity', required: true }],
  options: [
    whereOption,
    {
      name: 'fields',
      shorthand: null,
      type: String,
      argument: 'A,B,C',
      description: 'Comma-separated fields to show (default: _id, the display attribute, a few more and _updatedAt)',
      deprecated: false,
    },
    {
      name: 'limit',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Maximum number of records (default: 20)',
      deprecated: false,
    },
    {
      name: 'offset',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of records to skip (default: 0)',
      deprecated: false,
    },
    {
      name: 'sort',
      shorthand: null,
      type: String,
      argument: 'FIELD[:desc]',
      description: 'Sort by global attributes or _id/_createdAt/_updatedAt, comma-separated (default: _createdAt:desc)',
      deprecated: false,
    },
    scopeOption,
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List the 20 newest products', value: 'flexkit records ls products' },
    {
      name: 'Show chosen columns, cheapest first',
      value: 'flexkit records ls product --fields sku,name,price --sort price',
    },
    {
      name: 'Filter with a where input and read German values',
      value: `flexkit records ls products --where '{"status":{"eq":"draft"}}' --scope de`,
    },
    {
      name: 'Page through records as JSON',
      value: "flexkit records ls products --limit 100 --offset 200 --json | jq '.[]._id'",
    },
  ],
};

export const recordsGetCommand: Command = {
  name: 'get',
  description: 'Show one record with every attribute. Relationships are shown as record ids and assets as URLs.',
  arguments: [
    { name: 'entity', required: true },
    { name: 'id', required: true },
  ],
  options: [scopeOption, jsonOption, projectOption],
  examples: [
    { name: 'Show a product', value: 'flexkit records get product 0c5a7e7b-2f4e-4bb1-9a63-4f1d8c2e9a10' },
    {
      name: 'Read one value of a record with jq',
      value: "flexkit records get products prod_bag_001 --json | jq -r '.name.default'",
    },
  ],
};

export const recordsCountCommand: Command = {
  name: 'count',
  description: 'Count the records of an entity, optionally only those matching --where.',
  arguments: [{ name: 'entity', required: true }],
  options: [whereOption, jsonOption, projectOption],
  examples: [
    { name: 'Count every product', value: 'flexkit records count products' },
    {
      name: 'Count products in stock',
      value: `flexkit records count products --where '{"stock":{"gt":0}}'`,
    },
  ],
};

export const recordsCreateCommand: Command = {
  name: 'create',
  description:
    'Create a record from --data and/or --set values. A new id is generated unless the data has an _id. Scoped attributes take a value for the chosen scope or an object keyed by scope; relationship and asset attributes take record ids.',
  arguments: [{ name: 'entity', required: true }],
  options: [...dataOptions, jsonOption, projectOption],
  examples: [
    {
      name: 'Create a product from flags',
      value: 'flexkit records create product --set sku=BAG-001 --set name="Canvas bag" --set price=49',
    },
    {
      name: 'Create a product with values in two scopes and a brand',
      value: `flexkit records create products --data '{"sku":"BAG-002","name":{"default":"Tote","de":"Tasche"},"brand":"brand_acme"}'`,
    },
    {
      name: 'Create a record from a JSON file and keep its id',
      value: "flexkit records create product --data @product.json --json | jq -r '._id'",
    },
  ],
};

export const recordsUpdateCommand: Command = {
  name: 'update',
  description:
    'Change attributes of one record; attributes you do not pass are left as they are. Relationship and asset attributes are replaced by the given ids, and null clears a value.',
  arguments: [
    { name: 'entity', required: true },
    { name: 'id', required: true },
  ],
  options: [...dataOptions, jsonOption, projectOption],
  examples: [
    {
      name: 'Change the price of a product',
      value: 'flexkit records update product prod_bag_001 --set price=39.5',
    },
    {
      name: 'Set the German name only',
      value: 'flexkit records update products prod_bag_001 --set name=Tasche --scope de',
    },
    {
      name: 'Replace the categories and clear the subtitle',
      value: `flexkit records update product prod_bag_001 --data '{"categories":["cat_bags","cat_sale"],"subtitle":null}'`,
    },
  ],
};

export const recordsRemoveCommand: Command = {
  name: 'rm',
  description: 'Delete one or more records and their scoped values. Asks for confirmation unless --yes is passed.',
  arguments: [
    { name: 'entity', required: true },
    { name: 'id...', required: true },
  ],
  options: [
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Delete without asking for confirmation',
      deprecated: false,
    },
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Delete a product', value: 'flexkit records rm product prod_bag_001' },
    {
      name: 'Delete several records in a script',
      value: 'flexkit records rm products prod_bag_001 prod_bag_002 --yes',
    },
  ],
};

export const recordsCommand: Command = {
  name: 'records',
  description:
    "List, read, create, update and delete the records of your project's entities without writing GraphQL. Entities are named by their name or plural (product or products), as in the deployed schema.",
  arguments: [],
  subcommands: [
    recordsListCommand,
    recordsGetCommand,
    recordsCountCommand,
    recordsCreateCommand,
    recordsUpdateCommand,
    recordsRemoveCommand,
  ],
  options: [projectOption],
  examples: [
    { name: 'List products', value: 'flexkit records ls products' },
    { name: 'Show one product', value: 'flexkit records get product prod_bag_001' },
    { name: 'Create a product', value: 'flexkit records create product --set sku=BAG-001 --set price=49' },
    { name: 'Delete a product', value: 'flexkit records rm product prod_bag_001' },
  ],
};
