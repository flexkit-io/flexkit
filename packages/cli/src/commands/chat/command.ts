import type { Command, CommandOption } from '../help';

const projectOption: CommandOption = {
  name: 'project',
  shorthand: 'p',
  type: String,
  argument: 'ID',
  description: 'Project to use (default: linked project)',
  deprecated: false,
};

export const chatListCommand: Command = {
  name: 'ls',
  description:
    'List your chats with the Chat Agent in this project, most recent first. With --search, find chats by what was said in them (keyword and meaning).',
  arguments: [],
  options: [
    {
      name: 'search',
      shorthand: null,
      type: String,
      argument: 'QUERY',
      description: 'Search your chat messages instead of listing chats (best match per chat, up to 30)',
      deprecated: false,
    },
    {
      name: 'limit',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of chats to list (default: 30)',
      deprecated: false,
    },
    {
      name: 'offset',
      shorthand: null,
      type: Number,
      argument: 'N',
      description: 'Number of chats to skip (default: 0)',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the chats (or search results) as JSON',
      deprecated: false,
    },
    projectOption,
  ],
  examples: [
    { name: 'List your recent chats', value: 'flexkit chat ls' },
    { name: 'Find the chat where you discussed refunds', value: 'flexkit chat ls --search "refund policy"' },
    {
      name: 'Print the ids and titles of your last 100 chats',
      value: 'flexkit chat ls --limit 100 --json | jq -r \'.[] | "\\(.id) \\(.title)"\'',
    },
  ],
};

export const chatShowCommand: Command = {
  name: 'show',
  description:
    'Print the transcript of a chat: your messages, the agent replies, the tools it called, files it created, and questions or changes still waiting on you.',
  arguments: [{ name: 'chatId', required: true }],
  options: [
    {
      name: 'all',
      shorthand: null,
      type: Boolean,
      description: 'Print the whole history (default: the latest 50 messages)',
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the chat, its messages and pending items as JSON',
      deprecated: false,
    },
    projectOption,
  ],
  examples: [
    { name: 'Read a chat', value: 'flexkit chat show 3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13' },
    {
      name: 'Print every message of a long chat',
      value: 'flexkit chat show 3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13 --all',
    },
    {
      name: 'Get the text of the last reply',
      value: "flexkit chat show 3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13 --json | jq -r '.messages[-1].textContent'",
    },
  ],
};

export const chatStopCommand: Command = {
  name: 'stop',
  description:
    'Stop the turn the agent is working on in a chat. What it wrote so far is kept; pending questions and change proposals of that turn are cancelled.',
  arguments: [{ name: 'chatId', required: true }],
  options: [
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description: 'Print the stopped message as JSON',
      deprecated: false,
    },
    projectOption,
  ],
  examples: [{ name: 'Stop a long-running turn', value: 'flexkit chat stop 3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13' }],
};

export const chatRenameCommand: Command = {
  name: 'rename',
  description: 'Rename a chat.',
  arguments: [
    { name: 'chatId', required: true },
    { name: 'title', required: true },
  ],
  options: [
    { name: 'json', shorthand: null, type: Boolean, description: 'Print the renamed chat as JSON', deprecated: false },
    projectOption,
  ],
  examples: [
    {
      name: 'Give a chat a clear title',
      value: 'flexkit chat rename 3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13 "Q3 price update"',
    },
  ],
};

export const chatRemoveCommand: Command = {
  name: 'rm',
  description: 'Delete a chat and its messages. Files the agent created stay available at their links.',
  arguments: [{ name: 'chatId', required: true }],
  options: [
    {
      name: 'yes',
      shorthand: 'y',
      type: Boolean,
      description: 'Delete without asking for confirmation',
      deprecated: false,
    },
    { name: 'json', shorthand: null, type: Boolean, description: 'Print the API response as JSON', deprecated: false },
    projectOption,
  ],
  examples: [
    { name: 'Delete a chat (asks first)', value: 'flexkit chat rm 3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13' },
    { name: 'Delete a chat in a script', value: 'flexkit chat rm 3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13 --yes' },
  ],
};

export const chatCommand: Command = {
  name: 'chat',
  description:
    "Talk to the project's Chat Agent from the terminal. With a prompt, sends it (to a new chat, or to --chat) and streams the reply to stdout; tool calls are shown dimmed on stderr. Use - to read the prompt from stdin. Without a prompt in a terminal, opens an interactive session (type /exit to leave). Questions and change approvals are asked in the terminal; without one, the command stops with exit code 3 and prints how to continue. Ctrl+C stops the running turn. A prompt whose first word is a subcommand name must follow -- or be passed with --message.",
  arguments: [{ name: 'prompt|-', required: false }],
  subcommands: [chatListCommand, chatShowCommand, chatStopCommand, chatRenameCommand, chatRemoveCommand],
  options: [
    {
      name: 'chat',
      shorthand: 'c',
      type: String,
      argument: 'CHAT_ID',
      description: 'Continue this chat instead of starting a new one (also answers a question it waits on)',
      deprecated: false,
    },
    {
      name: 'message',
      shorthand: 'm',
      type: String,
      argument: 'TEXT',
      description: 'The prompt, for text that starts with a subcommand name (same as a prompt after --)',
      deprecated: false,
    },
    {
      name: 'model',
      shorthand: null,
      type: String,
      argument: 'MODEL_ID',
      description:
        "Model for this turn: auto, or a model id such as anthropic/claude-sonnet-5, optionally with :effort (default: the chat's model, or auto)",
      deprecated: false,
    },
    {
      name: 'json',
      shorthand: null,
      type: Boolean,
      description:
        'Print the raw stream as NDJSON on stdout: a first {"type":"flexkit-turn"} line with the chat id, then one UI chunk per line',
      deprecated: false,
    },
    projectOption,
  ],
  examples: [
    { name: 'Ask a question and stream the answer', value: 'flexkit chat "Which five products sold best last week?"' },
    {
      name: 'Continue a chat',
      value: 'flexkit chat --chat 3f6c1a52-8d4e-4b7a-9c1e-2a5b7d9e0f13 "Now only the ones in stock"',
    },
    { name: 'Send a file as the prompt and save the reply', value: 'cat brief.md | flexkit chat - > reply.md' },
    { name: 'Open an interactive session', value: 'flexkit chat' },
    { name: 'A prompt that starts with a subcommand name', value: 'flexkit chat -- ls the products without a price' },
  ],
};
