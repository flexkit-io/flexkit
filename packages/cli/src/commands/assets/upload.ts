import bytes from 'bytes';
import table from '../../util/output/table';
import { runWithConcurrency } from '../../util/concurrency';
import { collectUploadSources, uploadSource } from '../../util/assets/upload';
import { tagAssets } from '../../util/assets/tags';
import { getCommandName } from '../../util/pkg';
import type Client from '../../util/client';
import type { AssetRecord, IdStrategy } from '../../util/assets/upload';

type UploadFlags = {
  concurrency: number;
  idFrom?: string;
  tag?: string;
  json: boolean;
};

export default async function uploadAssets(
  client: Client,
  projectId: string,
  inputs: string[],
  flags: UploadFlags
): Promise<number> {
  const { output } = client;

  if (inputs.length === 0) {
    output.error(`Missing file, directory or URL. Usage: ${getCommandName('assets upload <path|url> [...]')}`);

    return 1;
  }

  if (flags.idFrom && flags.idFrom !== 'filename' && flags.idFrom !== 'hash') {
    output.error(`Invalid --id-from value "${flags.idFrom}". Expected "filename" or "hash".`);

    return 1;
  }

  const idStrategy: IdStrategy = (flags.idFrom as IdStrategy | undefined) ?? 'random';
  let sources;

  try {
    sources = await collectUploadSources(inputs, client.cwd);
  } catch (error) {
    output.error(error instanceof Error ? error.message : String(error));

    return 1;
  }

  if (sources.length === 0) {
    output.error('No files found to upload.');

    return 1;
  }

  output.spinner(`Uploading ${sources.length} asset${sources.length > 1 ? 's' : ''}...`);

  const results = await runWithConcurrency(sources, flags.concurrency, async (source) =>
    uploadSource(client, projectId, source, { idStrategy })
  );

  output.stopSpinner();

  const uploaded: AssetRecord[] = [];
  const failures: { source: string; message: string }[] = [];

  for (const entry of results) {
    if (entry.error) {
      failures.push({ source: entry.item.source, message: entry.error.message });
      continue;
    }

    if (entry.result) {
      uploaded.push(entry.result);
    }
  }

  if (flags.tag && uploaded.length > 0) {
    try {
      await tagAssets(client, projectId, flags.tag, uploaded.map((asset) => asset._id));
    } catch (error) {
      output.error(error instanceof Error ? error.message : String(error));

      return 1;
    }
  }

  if (flags.json) {
    for (const asset of uploaded) {
      client.stdout.write(`${JSON.stringify(asset)}\n`);
    }
  } else if (uploaded.length > 0) {
    const rows = [
      ['ID', 'Filename', 'Size', 'Deduped'],
      ...uploaded.map((asset) => [
        asset._id,
        asset.originalFilename ?? '',
        bytes(asset.size ?? 0) ?? '',
        asset.deduped ? 'yes' : 'no',
      ]),
    ];

    output.print(`${table(rows)}\n`);
  }

  const dedupedCount = uploaded.filter((asset) => asset.deduped).length;

  output.log(
    `Uploaded ${uploaded.length - dedupedCount}, deduped ${dedupedCount}, failed ${failures.length}${
      flags.tag ? `, tagged with "${flags.tag}"` : ''
    }.`
  );

  for (const failure of failures) {
    output.error(`${failure.source}: ${failure.message}`);
  }

  return failures.length > 0 ? 1 : 0;
}
