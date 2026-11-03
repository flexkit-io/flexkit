import type Client from '../util/client';
import { link, unlink } from './link';
import apiCommand from './api';
import queryCommand from './query';
import schemaCommand from './schema';
import deploymentsCommand from './deployments';
import recordsCommand from './records';
import searchCommand from './search';
import automationsCommand from './automations';
import runsCommand from './runs';
import approvalsCommand from './approvals';
import chatCommand from './chat';
import activityCommand from './activity';
import skillsCommand from './skills';
import knowledgeCommand from './knowledge';
import pluginsCommand from './plugins';
import usageCommand from './usage';
import mcpCommand from './mcp';
import tokensCommand from './tokens';
import membersCommand from './members';
import webhooksCommand from './webhooks';
import corsCommand from './cors';
import logsCommand from './logs';
import memoryCommand from './memory';

type CommandHandler = (client: Client) => Promise<number>;

/**
 * Commands built on the shared command runner. The older commands (deploy,
 * import, project, …) are still dispatched by the switch in src/index.ts.
 */
export const commandRegistry: Record<string, CommandHandler | undefined> = {
  link,
  unlink,
  api: apiCommand,
  query: queryCommand,
  schema: schemaCommand,
  deployments: deploymentsCommand,
  records: recordsCommand,
  search: searchCommand,
  automations: automationsCommand,
  runs: runsCommand,
  approvals: approvalsCommand,
  chat: chatCommand,
  activity: activityCommand,
  skills: skillsCommand,
  knowledge: knowledgeCommand,
  plugins: pluginsCommand,
  usage: usageCommand,
  mcp: mcpCommand,
  tokens: tokensCommand,
  members: membersCommand,
  webhooks: webhooksCommand,
  cors: corsCommand,
  logs: logsCommand,
  memory: memoryCommand,
};
