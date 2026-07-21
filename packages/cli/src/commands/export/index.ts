import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as tar from 'tar';
import parseArguments from '../../util/parse-args';
import { handleError } from '../../util/handle-error';
import { resolveProject } from '../../util/get-project';
import { runWithConcurrency } from '../../util/concurrency';
import { formatGraphQLErrors, graphqlRequest } from '../../util/graphql';
import { getEntitySchemas, getClassifiedAttributes, getScopeNames, capitalize } from '../../util/import/schema';
import {
  assetBundleFilename,
  downloadAssetFile,
  fetchAllAssets,
  prepareDestination,
  serializeAssetLine,
} from '../assets/export';
import { help } from '../help';
import { exportCommand } from './command';
import type Client from '../../util/client';
import type { ExportedAsset } from '../assets/export';
import type { EntitySchema, ClassifiedAttribute } from '../../util/import/schema';

const PAGE_SIZE = 100;

type EntityRecord = { _id: string; [key: string]: unknown };

function buildEntityQuery(entity: EntitySchema, classified: ClassifiedAttribute[], scopeNames: string[]): string {
  const selections: string[] = ['    _id'];

  for (const { attribute, kind } of classified) {
    switch (kind) {
      case 'global':
        selections.push(`    ${attribute.name}`);
        break;
      case 'local':
        selections.push(`    ${attribute.name} {\n      ${scopeNames.join('\n      ')}\n    }`);
        break;
      case 'asset-single':
      case 'ref-single':
        selections.push(`    ${attribute.name} {\n      _id\n    }`);
        break;
      case 'asset-multiple':
        selections.push(
          `    ${attribute.name}Connection {\n      edges {\n        properties {\n          sortOrder\n        }\n        node {\n          _id\n        }\n      }\n    }`
        );
        break;
      case 'ref-multiple':
        selections.push(`    ${attribute.name}(limit: 1000) {\n      _id\n    }`);
        break;
    }
  }

  return (
    `query Export${capitalize(entity.plural)}($where: ${entity.name}Where, $limit: Int, $offset: Int, $sort: [${entity.name}Sort!]) {\n` +
    `  ${entity.plural}(where: $where, limit: $limit, offset: $offset, sort: $sort) {\n` +
    `${selections.join('\n')}\n` +
    `  }\n` +
    `}`
  );
}

async function fetchAllEntities(
  client: Client,
  projectId: string,
  entity: EntitySchema,
  classified: ClassifiedAttribute[],
  scopeNames: string[]
): Promise<EntityRecord[]> {
  const query = buildEntityQuery(entity, classified, scopeNames);
  const records: EntityRecord[] = [];
  let offset = 0;

  for (;;) {
    const response = await graphqlRequest<{ [plural: string]: EntityRecord[] | undefined }>(client, projectId, query, {
      where: {},
      limit: PAGE_SIZE,
      offset,
      sort: [{ _id: 'ASC' }],
    });

    if (response.errors?.length) {
      throw new Error(`Failed to query ${entity.plural}: ${formatGraphQLErrors(response.errors)}`);
    }

    const page = response.data?.[entity.plural] ?? [];

    records.push(...page);
    offset += page.length;

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return records;
}

function unwrapFirst(value: unknown): { [key: string]: unknown } | null {
  if (Array.isArray(value)) {
    return (value[0] as { [key: string]: unknown } | undefined) ?? null;
  }

  if (typeof value === 'object' && value !== null) {
    return value as { [key: string]: unknown };
  }

  return null;
}

function getOrderedConnectionIds(value: unknown): string[] {
  const edges =
    (
      value as {
        edges?: { properties?: { sortOrder?: number | null } | null; node?: { _id?: string } | null }[];
      } | null
    )?.edges ?? [];

  return edges
    .map((edge, index) => ({
      _id: edge.node?._id ?? '',
      sortOrder: edge.properties?.sortOrder ?? index,
    }))
    .filter((edge) => edge._id)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((edge) => edge._id);
}

/**
 * Serializes one queried entity back into the import NDJSON line format.
 */
function serializeEntityLine(
  entity: EntitySchema,
  record: EntityRecord,
  classified: ClassifiedAttribute[],
  bundleFileByAssetId: Map<string, string>,
  referencedAssetIds: Set<string>,
  scopeNames: string[]
): string {
  const line: { [key: string]: unknown } = { _type: entity.name, _id: record._id };

  for (const { attribute, kind } of classified) {
    switch (kind) {
      case 'global': {
        const value = record[attribute.name];

        if (value !== null && value !== undefined) {
          line[attribute.name] = value;
        }

        break;
      }

      case 'local': {
        const node = unwrapFirst(record[attribute.name]);
        const values: { [scope: string]: unknown } = {};

        for (const scope of scopeNames) {
          const value = node?.[scope];

          if (value !== null && value !== undefined) {
            values[scope] = value;
          }
        }

        const scopesWithValue = Object.keys(values);
        const onlyDefault = scopesWithValue.length === 1 && scopesWithValue[0] === 'default';

        // Default-only values stay plain scalars; anything scoped beyond the
        // default is wrapped in _scopes so the import can restore every scope.
        if (onlyDefault) {
          line[attribute.name] = values.default;
        } else if (scopesWithValue.length > 0) {
          line[attribute.name] = { _scopes: values };
        }

        break;
      }

      case 'asset-single': {
        const node = unwrapFirst(record[attribute.name]);
        const assetId = typeof node?._id === 'string' ? node._id : null;
        const bundleFile = assetId ? bundleFileByAssetId.get(assetId) : undefined;

        if (assetId && bundleFile) {
          referencedAssetIds.add(assetId);
          line[attribute.name] = { _asset: `file://${bundleFile}` };
        }

        break;
      }

      case 'asset-multiple': {
        const assetIds = getOrderedConnectionIds(record[`${attribute.name}Connection`]);
        const refs = assetIds
          .filter((assetId) => bundleFileByAssetId.has(assetId))
          .map((assetId) => {
            referencedAssetIds.add(assetId);

            return { _asset: `file://${bundleFileByAssetId.get(assetId) ?? ''}` };
          });

        if (refs.length > 0) {
          line[attribute.name] = refs;
        }

        break;
      }

      case 'ref-single': {
        const node = unwrapFirst(record[attribute.name]);

        if (typeof node?._id === 'string') {
          line[attribute.name] = { _ref: node._id };
        }

        break;
      }

      case 'ref-multiple': {
        const nodes = Array.isArray(record[attribute.name]) ? (record[attribute.name] as { _id?: string }[]) : [];
        const refs = nodes
          .filter((node): node is { _id: string } => typeof node._id === 'string')
          .map((node) => ({ _ref: node._id }));

        if (refs.length > 0) {
          line[attribute.name] = refs;
        }

        break;
      }
    }
  }

  return JSON.stringify(line);
}

export default async function main(client: Client): Promise<number> {
  const { output } = client;
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--project': String,
      '--type': String,
      '--concurrency': Number,
      '--overwrite': Boolean,
      '--help': Boolean,
      '-h': '--help',
    });
  } catch (err: unknown) {
    handleError(err);

    return 1;
  }

  if (argv.flags['--help']) {
    output.print(help(exportCommand, { columns: client.stderr.columns }));

    return 2;
  }

  const project = resolveProject(client, argv.flags['--project']);

  if (!project) {
    return 1;
  }

  const allSchemas = getEntitySchemas(project);

  if (allSchemas.length === 0) {
    output.error('The local config has no schema; nothing to export.');

    return 1;
  }

  const typeFilter = argv.flags['--type']
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const entitySchemas = typeFilter
    ? allSchemas.filter((entity) => typeFilter.includes(entity.name) || typeFilter.includes(entity.plural))
    : allSchemas;

  if (typeFilter && entitySchemas.length !== typeFilter.length) {
    const known = new Set(entitySchemas.flatMap((entity) => [entity.name, entity.plural]));
    const unknown = typeFilter.filter((type) => !known.has(type));

    if (unknown.length > 0) {
      output.error(`Unknown entity type${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`);

      return 1;
    }
  }

  const concurrency = Math.max(1, argv.flags['--concurrency'] ?? 5);
  const { projectId } = project;
  const defaultFilename = `flexkit-export-${projectId}-${new Date().toISOString().slice(0, 10)}.tar.gz`;
  const destinationPath = await prepareDestination(
    client,
    argv.args[1] ?? defaultFilename,
    argv.flags['--overwrite'] ?? false
  );

  if (!destinationPath) {
    return 1;
  }

  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flexkit-export-'));

  try {
    output.spinner('Fetching asset metadata...');

    const assets = await fetchAllAssets(client, projectId);
    const assetsWithFiles = assets.filter((asset) => asset.path);
    const bundleFileByAssetId = new Map(assetsWithFiles.map((asset) => [asset._id, assetBundleFilename(asset)]));

    // --- Entities ---
    const referencedAssetIds = new Set<string>();
    const dataLines: string[] = [];
    let entityCount = 0;

    const scopeNames = getScopeNames(project);

    for (const entity of entitySchemas) {
      output.spinner(`Exporting ${entity.plural}...`);

      const classified = getClassifiedAttributes(entity);
      const records = await fetchAllEntities(client, projectId, entity, classified, scopeNames);

      for (const record of records) {
        dataLines.push(
          serializeEntityLine(entity, record, classified, bundleFileByAssetId, referencedAssetIds, scopeNames)
        );
      }

      entityCount += records.length;
    }

    // Full exports bundle every asset; --type exports only referenced ones.
    const assetsToBundle = typeFilter
      ? assetsWithFiles.filter((asset) => referencedAssetIds.has(asset._id))
      : assetsWithFiles;

    output.spinner(`Downloading ${assetsToBundle.length} file${assetsToBundle.length === 1 ? '' : 's'}...`);

    const downloads = await runWithConcurrency(assetsToBundle, concurrency, async (asset: ExportedAsset) => {
      await downloadAssetFile(client, asset, path.join(stagingDir, assetBundleFilename(asset)));
    });
    const failures = downloads.filter((download) => download.error);

    if (failures.length > 0) {
      output.stopSpinner();

      for (const failure of failures) {
        output.error(`${failure.item._id}: ${failure.error?.message ?? 'download failed'}`);
      }

      return 1;
    }

    const assetLines = assetsToBundle.map((asset) => serializeAssetLine(asset, assetBundleFilename(asset)));

    await fs.writeFile(path.join(stagingDir, 'data.ndjson'), dataLines.length > 0 ? `${dataLines.join('\n')}\n` : '');
    await fs.writeFile(
      path.join(stagingDir, 'assets.ndjson'),
      assetLines.length > 0 ? `${assetLines.join('\n')}\n` : ''
    );

    output.spinner('Writing tarball...');

    const bundleEntries = ['data.ndjson', 'assets.ndjson', ...(assetsToBundle.length > 0 ? ['files'] : [])];

    await tar.create({ gzip: true, file: destinationPath, cwd: stagingDir }, bundleEntries);
    output.stopSpinner();
    output.log(
      `Exported ${entityCount} entit${entityCount === 1 ? 'y' : 'ies'} and ${assetsToBundle.length} asset${
        assetsToBundle.length === 1 ? '' : 's'
      } to ${destinationPath}`
    );

    return 0;
  } catch (error) {
    output.stopSpinner();
    output.error(error instanceof Error ? error.message : String(error));

    return 1;
  } finally {
    output.stopSpinner();
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}
