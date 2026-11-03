import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import type { ProjectSchemaResponse, UiEntity, UiProjectSchema } from '@flexkit/schema';
import type Client from '../../util/client';
import { confirmAction, runCommandGroup, type Subcommand, type SubcommandContext } from '../../util/command-group';
import { printDetails, printJson, printTable } from '../../util/output/format';
import { findProjectLink } from '../../util/project-link';
import { getCommandName } from '../../util/pkg';
import { schemaCommand, schemaDiffCommand, schemaPullCommand, schemaShowCommand } from './command';
import { diffSchemas, hasBreakingChanges, summarizeDiff, type SchemaDiff, type SchemaSnapshot } from './diff';
import { renderSchemaDiff } from './render-diff';

/** `GET /schema`: the deployed schema as the Studio renders it. */
export async function fetchDeployedSchema(client: Client, projectId: string): Promise<ProjectSchemaResponse> {
  return client.fetch<ProjectSchemaResponse>('/schema', { projectId });
}

function findLocalProject(client: Client, projectId: string): UiProjectSchema | undefined {
  return client.flexkitConfig?.projects.find((project) => project.projectId === projectId);
}

function requireLocalConfig(client: Client): boolean {
  if (client.flexkitConfig) {
    return true;
  }

  client.output.error(
    'No flexkit.config.ts found in the current directory. Run the command from the folder that contains it, or pass --local-config <file>.'
  );

  return false;
}

const pull: Subcommand = {
  command: schemaPullCommand,
  needsProject: true,
  flags: { '--schema-only': Boolean },
  async run(ctx) {
    const { client } = ctx;
    const [file] = ctx.args;
    const toFile = Boolean(file && file !== '-');

    if (toFile) {
      client.output.spinner('Downloading the deployed schema');
    }

    const response = await fetchDeployedSchema(client, ctx.projectId);
    client.output.stopSpinner();
    const value = ctx.flags['--schema-only'] ? response.schema : response;

    if (!toFile || !file) {
      printJson(client, value);

      return 0;
    }

    const target = path.resolve(client.cwd, file);

    if (fs.existsSync(target) && !(await confirmAction(ctx, `${file} already exists. Overwrite it?`))) {
      return 1;
    }

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
    const count = response.schema.length;
    client.output.success(
      `Saved the deployed schema of ${ctx.projectId} to ${file} (${count.toString()} entit${count === 1 ? 'y' : 'ies'}${
        response.schemaHash ? `, hash ${response.schemaHash}` : ''
      }).`
    );

    return 0;
  },
};

function countRelationships(entity: UiEntity): number {
  return entity.attributes.filter((attribute) => attribute.scope === 'relationship').length;
}

function attributeFlags(attribute: UiEntity['attributes'][number]): string {
  const flags = [
    attribute.isRequired ? 'required' : '',
    attribute.unique ? 'unique' : '',
    attribute.searchable ? 'searchable' : '',
    attribute.hidden ? 'hidden' : '',
    attribute.readOnly ? 'read-only' : '',
  ].filter(Boolean);

  return flags.join(', ');
}

function showEntity(ctx: SubcommandContext, entity: UiEntity): number {
  const { client } = ctx;

  if (ctx.json) {
    printJson(client, entity);

    return 0;
  }

  printDetails(client, [
    ['Entity', entity.name],
    ['Plural', entity.plural],
    ['Display', entity.display ?? entity.attributes[0]?.name],
    ['Menu', [entity.menu?.group, entity.menu?.label, entity.menu?.hidden ? 'hidden' : ''].filter(Boolean).join(' / ')],
    ['Spaces', entity.spaces?.join(', ')],
    ['Field groups', entity.groups?.map((group) => group.name).join(', ')],
  ]);

  printTable(
    client,
    ['ATTRIBUTE', 'LABEL', 'TYPE', 'SCOPE', 'INPUT', 'RELATIONSHIP', 'FLAGS', 'SPACES'],
    entity.attributes.map((attribute) => [
      attribute.name,
      attribute.label,
      attribute.dataType,
      attribute.scope ?? 'global',
      attribute.inputType,
      attribute.relationship ? `→ ${attribute.relationship.entity} (${attribute.relationship.mode})` : '',
      attributeFlags(attribute),
      'spaces' in attribute && attribute.spaces ? attribute.spaces.join(', ') : '',
    ]),
    'This entity has no attributes.'
  );

  return 0;
}

const show: Subcommand = {
  command: schemaShowCommand,
  needsProject: true,
  flags: { '--entity': String, '-e': '--entity', '--local': Boolean },
  async run(ctx) {
    const { client } = ctx;
    let snapshot: Omit<ProjectSchemaResponse, 'schemaHash'> & { schemaHash?: string | null };

    if (ctx.flags['--local']) {
      if (!requireLocalConfig(client)) {
        return 1;
      }

      const local = findLocalProject(client, ctx.projectId);

      if (!local) {
        client.output.error(`Project ${ctx.projectId} is not defined in the local flexkit.config.ts.`);

        return 1;
      }

      snapshot = {
        projectId: local.projectId,
        title: local.title ?? '',
        schema: local.schema,
        scopes: local.scopes ?? [],
        spaces: local.spaces ?? [],
        menuGroups: local.menuGroups ?? [],
      };
    } else {
      client.output.spinner('Loading the deployed schema');
      snapshot = await fetchDeployedSchema(client, ctx.projectId);
      client.output.stopSpinner();
    }

    const entityName = ctx.flags['--entity'] as string | undefined;

    if (entityName) {
      const lower = entityName.toLowerCase();
      const entity = snapshot.schema.find(
        (candidate) => candidate.name.toLowerCase() === lower || candidate.plural.toLowerCase() === lower
      );

      if (!entity) {
        client.output.error(
          `Entity "${entityName}" not found. Available: ${snapshot.schema.map((candidate) => candidate.name).join(', ') || 'none'}.`
        );

        return 1;
      }

      return showEntity(ctx, entity);
    }

    if (ctx.json) {
      printJson(client, snapshot);

      return 0;
    }

    printDetails(client, [
      ['Project', snapshot.projectId],
      ['Title', snapshot.title],
      ['Source', ctx.flags['--local'] ? 'local flexkit.config.ts' : 'deployed'],
      ['Schema hash', snapshot.schemaHash],
    ]);

    printTable(
      client,
      ['ENTITY', 'PLURAL', 'ATTRIBUTES', 'RELATIONSHIPS', 'MENU GROUP', 'SPACES'],
      snapshot.schema.map((entity) => [
        entity.menu?.hidden ? `${entity.name} ${chalk.dim('(hidden)')}` : entity.name,
        entity.plural,
        entity.attributes.length.toString(),
        countRelationships(entity).toString(),
        entity.menu?.group ?? '',
        entity.spaces?.join(', ') ?? '',
      ]),
      'No entities deployed yet. Define them in flexkit.config.ts and run flexkit deploy.'
    );

    const scopes = snapshot.scopes.map((scope) => `${scope.name}${scope.isDefault ? chalk.dim(' (default)') : ''}`);
    const spaces = snapshot.spaces.map((space) => `${space.code} ${chalk.dim(space.label)}`);
    printDetails(client, [
      ['Scopes', scopes.join(', ') || chalk.dim('none')],
      ['Spaces', spaces.join(', ') || chalk.dim('none')],
      ['Menu groups', snapshot.menuGroups.map((group) => group.name).join(', ')],
    ]);
    client.output.dim(`Run ${getCommandName('schema show --entity <name>')} to list the attributes of an entity.`);

    return 0;
  },
};

function toSnapshot(source: {
  title?: string;
  schema: UiEntity[];
  scopes?: SchemaSnapshot['scopes'];
  spaces?: SchemaSnapshot['spaces'];
  menuGroups?: SchemaSnapshot['menuGroups'];
}): SchemaSnapshot {
  return {
    title: source.title,
    schema: source.schema as unknown as SchemaSnapshot['schema'],
    scopes: source.scopes ?? [],
    spaces: source.spaces ?? [],
    menuGroups: source.menuGroups ?? [],
  };
}

/** Local `flexkit.config.ts` projects to compare: the selected one, or all of them. */
function selectDiffProjects(ctx: SubcommandContext): UiProjectSchema[] | null {
  const { client } = ctx;
  const projects = client.flexkitConfig?.projects ?? [];
  const explicit =
    (ctx.flags['--project'] as string | undefined) ||
    process.env.FLEXKIT_PROJECT_ID?.trim() ||
    (projects.length > 1 ? findProjectLink(client.cwd)?.link.projectId : undefined);

  if (!explicit) {
    return projects;
  }

  const project = projects.find((candidate) => candidate.projectId === explicit);

  if (!project) {
    client.output.error(
      `Project ${explicit} is not defined in the local flexkit.config.ts (it defines ${
        projects.map((candidate) => candidate.projectId).join(', ') || 'no projects'
      }).`
    );

    return null;
  }

  return [project];
}

function describeSummary(diff: SchemaDiff): string {
  const counts = summarizeDiff(diff);
  const parts = [
    counts.added ? `${counts.added.toString()} added` : '',
    counts.removed ? `${counts.removed.toString()} removed` : '',
    counts.changed ? `${counts.changed.toString()} changed` : '',
  ].filter(Boolean);
  const entities = parts.length > 0 ? `Entities: ${parts.join(', ')}.` : 'No entity changes.';
  const issues = [
    counts.blocking ? chalk.red.bold(`${counts.blocking.toString()} blocking`) : '',
    counts.breaking ? chalk.red(`${counts.breaking.toString()} breaking`) : '',
    counts.warnings ? chalk.yellow(`${counts.warnings.toString()} warning${counts.warnings === 1 ? '' : 's'}`) : '',
  ].filter(Boolean);

  return issues.length > 0 ? `${entities} ${issues.join(', ')}.` : entities;
}

const diff: Subcommand = {
  command: schemaDiffCommand,
  flags: { '--exit-code': Boolean, '--fail-on-breaking': Boolean },
  async run(ctx) {
    const { client } = ctx;

    if (!requireLocalConfig(client)) {
      return 1;
    }

    const projects = selectDiffProjects(ctx);

    if (!projects) {
      return 1;
    }

    if (projects.length === 0) {
      client.output.error('The local flexkit.config.ts defines no projects.');

      return 1;
    }

    const results: { projectId: string; schemaHash: string | null; diff: SchemaDiff }[] = [];

    client.output.spinner('Comparing with the deployed schema');

    try {
      for (const project of projects) {
        const deployed = await fetchDeployedSchema(client, project.projectId);
        results.push({
          projectId: project.projectId,
          schemaHash: deployed.schemaHash,
          diff: diffSchemas(toSnapshot(deployed), toSnapshot(project)),
        });
      }
    } finally {
      client.output.stopSpinner();
    }

    if (ctx.json) {
      printJson(client, results);
    } else {
      for (const result of results) {
        const header = `${chalk.bold(result.projectId)} ${chalk.dim('deployed → flexkit.config.ts')}`;

        if (!result.diff.hasChanges) {
          client.output.print(
            `${header}\n  ${chalk.green('No differences.')} The local config matches the deployed schema.\n\n`
          );
          continue;
        }

        client.output.print(`${header}\n${renderSchemaDiff(result.diff)}\n\n  ${describeSummary(result.diff)}\n\n`);
      }

      const breaking = results.filter((result) => hasBreakingChanges(result.diff));

      if (breaking.length > 0) {
        client.output.warn(
          `${getCommandName('deploy')} refuses breaking changes unless you pass --allow-breaking-changes, and always refuses data type changes.`
        );
      } else if (results.some((result) => result.diff.hasChanges)) {
        client.output.log(`Run ${getCommandName('deploy')} to apply these changes.`);
      }
    }

    if (ctx.flags['--exit-code'] && results.some((result) => result.diff.hasChanges)) {
      return 1;
    }

    if (ctx.flags['--fail-on-breaking'] && results.some((result) => hasBreakingChanges(result.diff))) {
      return 1;
    }

    return 0;
  },
};

export default async function main(client: Client): Promise<number> {
  return runCommandGroup(client, {
    command: schemaCommand,
    subcommands: [pull, show, diff],
    defaultSubcommand: 'show',
  });
}
