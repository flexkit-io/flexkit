import { promises as fs } from 'node:fs';
import path from 'node:path';
import parseArguments from '../../util/parse-args';
import { handleError } from '../../util/handle-error';
import { getCommandName } from '../../util/pkg';
import { resolveProject } from '../../util/get-project';
import { runWithConcurrency } from '../../util/concurrency';
import { uploadSource } from '../../util/assets/upload';
import { tagAssets } from '../../util/assets/tags';
import { resolveImportInput, parseAssetLines } from '../../util/import/input';
import { parseImportLines, resolveAssetRef } from '../../util/import/parse';
import { getEntitySchemas, getClassifiedAttributes } from '../../util/import/schema';
import {
  buildCreateInput,
  buildRefConnectUpdate,
  buildReplaceUpdate,
  createEntityBatch,
  fetchExistingConnections,
  findExistingEntityIds,
  updateEntity,
} from '../../util/import/mutations';
import { isConstraintErrorMessage } from '../../util/graphql';
import { help } from '../help';
import { importCommand } from './command';
import type Client from '../../util/client';
import type { AssetMetadata } from '../../util/import/input';
import type { ParsedEntity } from '../../util/import/parse';
import type { EntitySchema } from '../../util/import/schema';
import type { UploadSource } from '../../util/assets/upload';

type ImportSummary = {
  entitiesCreated: number;
  entitiesReplaced: number;
  entitiesSkipped: number;
  entitiesFailed: number;
  assetsUploaded: number;
  assetsDeduped: number;
  assetsFailed: number;
};

type PlannedUpload = {
  ref: string;
  source: UploadSource;
  assetId?: string;
  tags: string[];
};

function toUploadSource(ref: string, filename?: string | null): UploadSource {
  const isUrl = ref.startsWith('http://') || ref.startsWith('https://');
  const fallbackName = isUrl
    ? decodeURIComponent(new URL(ref).pathname.split('/').pop() || 'file.bin')
    : path.basename(ref);

  return { source: ref, isUrl, filename: filename ?? fallbackName };
}

/**
 * Merges asset refs found in data lines with the assets.ndjson metadata so
 * bundle assets keep their original _id, filename and tags on re-import.
 */
function planUploads(assetRefs: string[], assetsMeta: AssetMetadata[], baseDir: string): PlannedUpload[] {
  const planned = new Map<string, PlannedUpload>();

  for (const meta of assetsMeta) {
    if (!meta._file) {
      continue;
    }

    const ref = resolveAssetRef(meta._file, baseDir);

    planned.set(ref, {
      ref,
      source: toUploadSource(ref, meta.originalFilename),
      assetId: meta._id,
      tags: meta.tags ?? [],
    });
  }

  for (const ref of assetRefs) {
    if (!planned.has(ref)) {
      planned.set(ref, { ref, source: toUploadSource(ref), tags: [] });
    }
  }

  return [...planned.values()];
}

async function validateLocalFiles(uploads: PlannedUpload[]): Promise<string[]> {
  const missing: string[] = [];

  for (const upload of uploads) {
    if (upload.source.isUrl) {
      continue;
    }

    try {
      await fs.access(upload.source.source);
    } catch {
      missing.push(upload.source.source);
    }
  }

  return missing;
}

function getConnectionAttributeNames(entity: EntitySchema): string[] {
  return getClassifiedAttributes(entity)
    .filter(({ kind }) => kind !== 'global' && kind !== 'local')
    .map(({ attribute }) => attribute.name);
}

export default async function main(client: Client): Promise<number> {
  const { output } = client;
  let argv;

  try {
    argv = parseArguments(client.argv.slice(2), {
      '--project': String,
      '--dry-run': Boolean,
      '--skip-existing': Boolean,
      '--replace': Boolean,
      '--batch-size': Number,
      '--concurrency': Number,
      '--tag': String,
      '--json': Boolean,
      '--help': Boolean,
      '-h': '--help',
    });
  } catch (err: unknown) {
    handleError(err);

    return 1;
  }

  if (argv.flags['--help']) {
    return (output.print(help(importCommand, { columns: client.stderr.columns })), 2);
  }

  const [, input] = argv.args;

  if (!input) {
    output.error(`Missing input. Usage: ${getCommandName('import <file.ndjson | dir | tarball>')}`);

    return 1;
  }

  if (argv.flags['--skip-existing'] && argv.flags['--replace']) {
    output.error('Pass either --skip-existing or --replace, not both.');

    return 1;
  }

  const project = resolveProject(client, argv.flags['--project']);

  if (!project) {
    return 1;
  }

  const replaceExisting = argv.flags['--replace'] ?? false;
  const batchSize = Math.max(1, argv.flags['--batch-size'] ?? 10);
  const concurrency = Math.max(1, argv.flags['--concurrency'] ?? 5);
  const dryRun = argv.flags['--dry-run'] ?? false;
  let resolvedInput;

  try {
    resolvedInput = await resolveImportInput(input, client.cwd);
  } catch (error) {
    output.error(error instanceof Error ? error.message : String(error));

    return 1;
  }

  try {
    const { assets: assetsMeta, errors: assetMetaErrors } = parseAssetLines(resolvedInput.assetLines);
    const parseResult = parseImportLines(resolvedInput.dataLines, project, resolvedInput.baseDir);
    const allErrors = [...assetMetaErrors, ...parseResult.errors];

    if (parseResult.entities.length > 0 && getEntitySchemas(project).length === 0) {
      output.error('The local config has no schema; cannot import entities.');

      return 1;
    }

    if (allErrors.length > 0) {
      for (const error of allErrors) {
        output.error(error);
      }

      return 1;
    }

    const uploads = planUploads(parseResult.assetRefs, assetsMeta, resolvedInput.baseDir);
    const missingFiles = await validateLocalFiles(uploads);

    if (missingFiles.length > 0) {
      for (const missing of missingFiles) {
        output.error(`Referenced file not found: ${missing}`);
      }

      return 1;
    }

    if (dryRun) {
      const summary = {
        entities: parseResult.entities.length,
        assets: uploads.length,
        types: [...new Set(parseResult.entities.map((entity) => entity.entity.name))],
      };

      if (argv.flags['--json']) {
        client.stdout.write(`${JSON.stringify(summary)}\n`);
      } else {
        output.log(
          `Dry run OK: ${summary.entities} entit${summary.entities === 1 ? 'y' : 'ies'} (${summary.types.join(', ') || 'none'}), ${summary.assets} asset${summary.assets === 1 ? '' : 's'}. Nothing was uploaded or created.`
        );
      }

      return 0;
    }

    const summary: ImportSummary = {
      entitiesCreated: 0,
      entitiesReplaced: 0,
      entitiesSkipped: 0,
      entitiesFailed: 0,
      assetsUploaded: 0,
      assetsDeduped: 0,
      assetsFailed: 0,
    };

    // --- Phase 1: upload assets (sha256 dedupe makes re-runs cheap) ---
    const assetIdByRef = new Map<string, string>();
    const assetIdsByTag = new Map<string, string[]>();

    if (uploads.length > 0) {
      output.spinner(`Uploading ${uploads.length} asset${uploads.length === 1 ? '' : 's'}...`);

      const uploadResults = await runWithConcurrency(uploads, concurrency, async (planned) =>
        uploadSource(client, project.projectId, planned.source, { assetId: planned.assetId })
      );

      output.stopSpinner();

      for (let index = 0; index < uploadResults.length; index += 1) {
        const uploadResult = uploadResults[index];
        const planned = uploads[index];

        if (uploadResult.error || !uploadResult.result) {
          summary.assetsFailed += 1;
          output.error(`${planned.source.source}: ${uploadResult.error?.message ?? 'upload failed'}`);
          continue;
        }

        const asset = uploadResult.result;

        assetIdByRef.set(planned.ref, asset._id);

        if (asset.deduped) {
          summary.assetsDeduped += 1;
        } else {
          summary.assetsUploaded += 1;
        }

        const tags = [...planned.tags, ...(argv.flags['--tag'] ? [argv.flags['--tag']] : [])];

        for (const tag of tags) {
          const ids = assetIdsByTag.get(tag) ?? [];

          ids.push(asset._id);
          assetIdsByTag.set(tag, ids);
        }
      }

      for (const [tag, ids] of assetIdsByTag) {
        try {
          await tagAssets(client, project.projectId, tag, ids);
        } catch (error) {
          output.error(error instanceof Error ? error.message : String(error));
        }
      }
    }

    // --- Phase 2: create/replace entities, grouped by type ---
    const entitiesByType = new Map<string, ParsedEntity[]>();

    for (const parsed of parseResult.entities) {
      const list = entitiesByType.get(parsed.entity.name) ?? [];

      list.push(parsed);
      entitiesByType.set(parsed.entity.name, list);
    }

    const replaceConnections = new Map<string, { [attributeName: string]: string[] }>();
    const importedEntities: ParsedEntity[] = [];

    for (const entitySchema of getEntitySchemas(project)) {
      const parsedEntities = entitiesByType.get(entitySchema.name) ?? [];

      if (parsedEntities.length === 0) {
        continue;
      }

      output.spinner(`Importing ${parsedEntities.length} ${entitySchema.plural}...`);

      const existingIds = await findExistingEntityIds(
        client,
        project.projectId,
        entitySchema,
        parsedEntities.map((parsed) => parsed._id)
      );
      const toCreate = parsedEntities.filter((parsed) => !existingIds.has(parsed._id));
      const existing = parsedEntities.filter((parsed) => existingIds.has(parsed._id));

      if (replaceExisting && existing.length > 0) {
        const connectionAttributes = getConnectionAttributeNames(entitySchema);
        const connections = await fetchExistingConnections(
          client,
          project.projectId,
          entitySchema,
          existing.map((parsed) => parsed._id),
          connectionAttributes
        );

        for (const [entityId, entityConnections] of connections) {
          replaceConnections.set(`${entitySchema.name}:${entityId}`, entityConnections);
        }

        for (const parsed of existing) {
          const update = buildReplaceUpdate(parsed, assetIdByRef, connections.get(parsed._id) ?? {});
          const result =
            Object.keys(update).length > 0
              ? await updateEntity(client, project.projectId, entitySchema, parsed._id, update)
              : {};

          if (result.errorMessage) {
            summary.entitiesFailed += 1;
            output.error(`Line ${parsed.line} (${parsed._id}): ${result.errorMessage}`);
            continue;
          }

          summary.entitiesReplaced += 1;
          importedEntities.push(parsed);
        }
      } else {
        summary.entitiesSkipped += existing.length;
      }

      for (let offset = 0; offset < toCreate.length; offset += batchSize) {
        const batch = toCreate.slice(offset, offset + batchSize);
        const inputs = batch.map((parsed) => buildCreateInput(parsed, assetIdByRef));
        const batchResult = await createEntityBatch(client, project.projectId, entitySchema, inputs);

        if (!batchResult.errorMessage) {
          summary.entitiesCreated += batch.length;
          importedEntities.push(...batch);
          continue;
        }

        // The whole batch failed; retry items one-by-one so a single bad
        // entity (e.g. a uniqueness conflict) doesn't sink its batch mates.
        for (const parsed of batch) {
          const singleResult = await createEntityBatch(client, project.projectId, entitySchema, [
            buildCreateInput(parsed, assetIdByRef),
          ]);

          if (!singleResult.errorMessage) {
            summary.entitiesCreated += 1;
            importedEntities.push(parsed);
            continue;
          }

          if (isConstraintErrorMessage(singleResult.errorMessage)) {
            summary.entitiesSkipped += 1;
            output.debug(`Line ${parsed.line} (${parsed._id}): skipped (${singleResult.errorMessage})`);
            continue;
          }

          summary.entitiesFailed += 1;
          output.error(`Line ${parsed.line} (${parsed._id}): ${singleResult.errorMessage}`);
        }
      }

      output.stopSpinner();
    }

    // --- Phase 3: connect entity-to-entity refs (forward refs now exist) ---
    const withRefs = importedEntities.filter(
      (parsed) => parsed.refSingles.length > 0 || parsed.refMultiples.length > 0
    );

    if (withRefs.length > 0) {
      output.spinner(`Connecting relationships for ${withRefs.length} entit${withRefs.length === 1 ? 'y' : 'ies'}...`);

      for (const parsed of withRefs) {
        const update = buildRefConnectUpdate(
          parsed,
          replaceConnections.get(`${parsed.entity.name}:${parsed._id}`)
        );

        if (!update) {
          continue;
        }

        const result = await updateEntity(client, project.projectId, parsed.entity, parsed._id, update);

        if (result.errorMessage) {
          summary.entitiesFailed += 1;
          output.error(`Line ${parsed.line} (${parsed._id}): failed to connect refs: ${result.errorMessage}`);
        }
      }

      output.stopSpinner();
    }

    if (argv.flags['--json']) {
      client.stdout.write(`${JSON.stringify(summary)}\n`);
    } else {
      output.log(
        `Created ${summary.entitiesCreated}, replaced ${summary.entitiesReplaced}, skipped ${summary.entitiesSkipped}, failed ${summary.entitiesFailed} entities. ` +
          `Uploaded ${summary.assetsUploaded}, deduped ${summary.assetsDeduped}, failed ${summary.assetsFailed} assets.`
      );
    }

    return summary.entitiesFailed > 0 || summary.assetsFailed > 0 ? 1 : 0;
  } finally {
    output.stopSpinner();
    await resolvedInput.cleanup();
  }
}
