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

const jsonOption = option('json', Boolean, 'Print the API response as JSON on stdout');
const projectOption = option('project', String, 'Project to use (default: linked project)', 'ID', 'p');
const yesOption = option('yes', Boolean, 'Skip the confirmation prompt', undefined, 'y');
const waitOption = option('wait', Boolean, 'Wait until indexing finishes and report the result');
const timeoutOption = option('timeout', Number, 'Seconds to wait with --wait (default: 600)', 'SECONDS');

export const knowledgeListCommand: Command = {
  name: 'ls',
  description: 'List the documents in the project knowledge that you can read, newest first.',
  arguments: [],
  options: [
    option('search', String, 'Only documents whose title or content matches the text', 'TEXT', 's'),
    option('status', String, 'Only documents with this status: processing, ready or failed', 'STATUS'),
    option('limit', Number, 'Documents per page, 1–100 (default: 25)', 'N', 'n'),
    option('offset', Number, 'Documents to skip, for paging (default: 0)', 'N'),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'List documents', value: 'flexkit knowledge ls' },
    { name: 'Find documents about returns', value: 'flexkit knowledge ls --search "return policy"' },
    {
      name: 'Ids of the documents that failed to index',
      value: "flexkit knowledge ls --status failed --json | jq -r '.sources[].id'",
    },
  ],
};

export const knowledgeInspectCommand: Command = {
  name: 'inspect',
  description:
    'Show a document: its metadata, indexing status, latest job and the records and entity types it is attached to.',
  arguments: [{ name: 'sourceId', required: true }],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Show a document', value: 'flexkit knowledge inspect 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f' },
    {
      name: 'Print the passage count',
      value:
        "flexkit knowledge inspect 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f --json | jq '.source.currentVersion.passageCount'",
    },
  ],
};

export const knowledgeAddCommand: Command = {
  name: 'add',
  description:
    'Add documents to the project knowledge: files (PDF, Word, PowerPoint, Markdown, text, HTML, up to 20 MB each), folders (walked recursively; other file types are skipped with a warning) and https:// web pages. Each one is uploaded, then indexed in the background.',
  arguments: [{ name: 'file|dir|url...', required: true }],
  options: [
    option(
      'title',
      String,
      'Title of the document (only with one input; default: the file name or page title)',
      'TITLE'
    ),
    option(
      'space',
      [String],
      'Restrict reading to members of this space code (repeatable; default: every project member)',
      'CODE'
    ),
    option(
      'hide-from-agent',
      Boolean,
      'Keep the documents out of the agent’s knowledge search (default: visible to the agent)'
    ),
    option(
      'link',
      [String],
      'Attach every document to a record (entity:recordId) or an entity type (entity) (repeatable)',
      'ENTITY[:ID]',
      'l'
    ),
    option('concurrency', Number, 'Uploads in parallel (default: 3)', 'N', 'c'),
    waitOption,
    timeoutOption,
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Add a PDF and wait until it is searchable', value: 'flexkit knowledge add ./handbook.pdf --wait' },
    { name: 'Add a folder of documents', value: 'flexkit knowledge add ./docs/policies --concurrency 5' },
    {
      name: 'Add a web page with a title',
      value: 'flexkit knowledge add https://example.com/shipping --title "Shipping policy"',
    },
    {
      name: 'Attach a spec sheet to a product and only share it with a space',
      value: 'flexkit knowledge add ./chair-spec.pdf --link product:product-chair --space sales',
    },
  ],
};

export const knowledgeUpdateCommand: Command = {
  name: 'update',
  description: 'Change a document’s title, the spaces that can read it, or whether the agent can search it.',
  arguments: [{ name: 'sourceId', required: true }],
  options: [
    option('title', String, 'New title', 'TITLE'),
    option('space', [String], 'Replace the spaces that can read the document (repeatable)', 'CODE'),
    option('all-members', Boolean, 'Let every project member read the document (clears the spaces)'),
    option('hide-from-agent', Boolean, 'Keep the document out of the agent’s knowledge search'),
    option('show-to-agent', Boolean, 'Let the agent search the document again'),
    jsonOption,
    projectOption,
  ],
  examples: [
    {
      name: 'Rename a document',
      value: 'flexkit knowledge update 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f --title "Returns policy 2026"',
    },
    {
      name: 'Share it with two spaces only',
      value: 'flexkit knowledge update 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f --space sales --space support',
    },
    {
      name: 'Hide it from the agent',
      value: 'flexkit knowledge update 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f --hide-from-agent',
    },
  ],
};

export const knowledgeRemoveCommand: Command = {
  name: 'rm',
  description: 'Delete documents, their passages and their links. The agent can no longer cite them.',
  arguments: [{ name: 'sourceId...', required: true }],
  options: [yesOption, jsonOption, projectOption],
  examples: [
    { name: 'Delete a document', value: 'flexkit knowledge rm 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f' },
    {
      name: 'Delete every failed document without a prompt',
      value: "flexkit knowledge ls --status failed --json | jq -r '.sources[].id' | xargs flexkit knowledge rm --yes",
    },
  ],
};

export const knowledgeReingestCommand: Command = {
  name: 'reingest',
  description:
    'Index a document again: from the stored file, or from a fresh fetch of its web page. The current version stays searchable until the new one is ready.',
  arguments: [{ name: 'sourceId', required: true }],
  options: [waitOption, timeoutOption, jsonOption, projectOption],
  examples: [
    { name: 'Re-fetch a web page', value: 'flexkit knowledge reingest 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f' },
    { name: 'Re-index and wait', value: 'flexkit knowledge reingest 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f --wait' },
  ],
};

export const knowledgeDownloadCommand: Command = {
  name: 'download',
  description:
    'Download the original file of an uploaded document. dest can be a file, a folder, or - for stdout (default: the document’s file name in the current folder). Web pages have no stored file.',
  arguments: [
    { name: 'sourceId', required: true },
    { name: 'dest', required: false },
  ],
  options: [option('force', Boolean, 'Overwrite an existing file', undefined, 'f'), projectOption],
  examples: [
    {
      name: 'Download into the current folder',
      value: 'flexkit knowledge download 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f',
    },
    {
      name: 'Download into a folder',
      value: 'flexkit knowledge download 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f ./backup/',
    },
    {
      name: 'Pipe the file to another tool',
      value: 'flexkit knowledge download 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f - | pdftotext - -',
    },
  ],
};

export const knowledgeSearchCommand: Command = {
  name: 'search',
  description:
    'Search the documents you can read the way the agent does (semantic and keyword search) and print the best passages with their document and location.',
  arguments: [{ name: 'query', required: true }],
  options: [
    option('limit', Number, 'Passages to return, 1–10 (default: 5)', 'N', 'n'),
    option('source', [String], 'Only search these documents (repeatable, up to 10)', 'SOURCE_ID'),
    option(
      'about',
      String,
      'Prefer the documents attached to a record (entity:recordId) or an entity type',
      'ENTITY[:ID]'
    ),
    jsonOption,
    projectOption,
  ],
  examples: [
    { name: 'Ask a question', value: 'flexkit knowledge search "how long do customers have to return an item?"' },
    {
      name: 'Search the documents of one product',
      value: 'flexkit knowledge search "assembly instructions" --about product:product-chair',
    },
    {
      name: 'Top passage text only',
      value: 'flexkit knowledge search "warranty" --limit 1 --json | jq -r \'.hits[0].text\'',
    },
  ],
};

export const knowledgeLinkCommand: Command = {
  name: 'link',
  description:
    'Attach a document to a record, or to every record of an entity type when no record id is given. The agent then prefers it when working on those records.',
  arguments: [
    { name: 'sourceId', required: true },
    { name: 'entity', required: true },
    { name: 'recordId', required: false },
  ],
  options: [jsonOption, projectOption],
  examples: [
    {
      name: 'Attach to one record',
      value: 'flexkit knowledge link 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f product product-chair',
    },
    {
      name: 'Attach to the whole entity type',
      value: 'flexkit knowledge link 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f order',
    },
  ],
};

export const knowledgeUnlinkCommand: Command = {
  name: 'unlink',
  description: 'Detach a document from a record, or from an entity type when no record id is given.',
  arguments: [
    { name: 'sourceId', required: true },
    { name: 'entity', required: true },
    { name: 'recordId', required: false },
  ],
  options: [jsonOption, projectOption],
  examples: [
    {
      name: 'Detach from one record',
      value: 'flexkit knowledge unlink 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f product product-chair',
    },
    {
      name: 'Detach from the entity type',
      value: 'flexkit knowledge unlink 6b1f3c2e-4d5a-4e7b-8c9d-0a1b2c3d4e5f order',
    },
  ],
};

export const knowledgeCommand: Command = {
  name: 'knowledge',
  description:
    'Manage the project knowledge: documents and web pages the agent searches and cites. Add, search, download and attach them to records.',
  arguments: [],
  subcommands: [
    knowledgeListCommand,
    knowledgeInspectCommand,
    knowledgeAddCommand,
    knowledgeUpdateCommand,
    knowledgeRemoveCommand,
    knowledgeReingestCommand,
    knowledgeDownloadCommand,
    knowledgeSearchCommand,
    knowledgeLinkCommand,
    knowledgeUnlinkCommand,
  ],
  options: [jsonOption, projectOption],
  examples: [
    { name: 'Add a folder of documents and wait for indexing', value: 'flexkit knowledge add ./docs --wait' },
    { name: 'Search them', value: 'flexkit knowledge search "refund window"' },
    { name: 'List documents', value: 'flexkit knowledge ls' },
  ],
};
