import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as tar from 'tar';
import { formatGraphQLErrors, graphqlRequest } from '../../util/graphql';
import { runWithConcurrency } from '../../util/concurrency';
import type Client from '../../util/client';

export type ExportedAsset = {
  _id: string;
  extension: string | null;
  height: number | null;
  lqip: string | null;
  mimeType: string | null;
  originalFilename: string | null;
  path: string | null;
  sha256: string | null;
  size: number | null;
  width: number | null;
  tags?: { name: string }[];
};

type ExportFlags = {
  tag?: string;
  concurrency: number;
  overwrite: boolean;
};

const PAGE_SIZE = 100;

export function getImagesBaseUrl(client: Client): string {
  return `${client.authUrl}/images/`;
}

export async function fetchAllAssets(client: Client, projectId: string, tag?: string): Promise<ExportedAsset[]> {
  const assets: ExportedAsset[] = [];
  const where = tag ? { tags: { some: { name: { eq: tag } } } } : {};
  let offset = 0;

  for (;;) {
    const response = await graphqlRequest<{ _assets?: ExportedAsset[] }>(
      client,
      projectId,
      `query ExportAssets($where: _assetWhere, $limit: Int, $offset: Int, $sort: [_assetSort!]) {\n` +
        `  _assets(where: $where, limit: $limit, offset: $offset, sort: $sort) {\n` +
        `    _id\n    extension\n    height\n    lqip\n    mimeType\n    originalFilename\n    path\n    sha256\n    size\n    width\n` +
        `    tags {\n      name\n    }\n` +
        `  }\n` +
        `}`,
      { where, limit: PAGE_SIZE, offset, sort: [{ _createdAt: 'ASC' }] }
    );

    if (response.errors?.length) {
      throw new Error(`Failed to query assets: ${formatGraphQLErrors(response.errors)}`);
    }

    const page = response.data?._assets ?? [];

    assets.push(...page);
    offset += page.length;

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return assets;
}

function sanitizeForFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

export function assetBundleFilename(asset: ExportedAsset): string {
  const extensionFromPath = asset.path?.match(/\.([A-Za-z0-9]+)$/)?.[1];
  const extension = asset.extension ?? extensionFromPath ?? 'bin';

  return `files/${sanitizeForFilename(asset._id)}.${extension}`;
}

export function serializeAssetLine(asset: ExportedAsset, bundleFile: string): string {
  return JSON.stringify({
    _id: asset._id,
    path: asset.path,
    mimeType: asset.mimeType,
    originalFilename: asset.originalFilename,
    extension: asset.extension,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    lqip: asset.lqip,
    sha256: asset.sha256,
    tags: (asset.tags ?? []).map((tagItem) => tagItem.name),
    _file: bundleFile,
  });
}

export async function downloadAssetFile(client: Client, asset: ExportedAsset, destination: string): Promise<void> {
  if (!asset.path) {
    throw new Error(`Asset ${asset._id} has no file path.`);
  }

  const url = `${getImagesBaseUrl(client)}${asset.path}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url} (HTTP ${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, buffer);
}

export async function prepareDestination(
  client: Client,
  destination: string,
  overwrite: boolean
): Promise<string | null> {
  const absolutePath = path.resolve(client.cwd, destination);

  try {
    await fs.stat(absolutePath);

    if (!overwrite) {
      client.output.error(`Destination ${destination} already exists. Pass --overwrite to replace it.`);

      return null;
    }
  } catch {
    // Destination does not exist, which is what we want.
  }

  return absolutePath;
}

export default async function exportAssets(
  client: Client,
  projectId: string,
  destination: string | undefined,
  flags: ExportFlags
): Promise<number> {
  const { output } = client;
  const defaultFilename = `flexkit-assets-${projectId}-${new Date().toISOString().slice(0, 10)}.tar.gz`;
  const destinationPath = await prepareDestination(client, destination ?? defaultFilename, flags.overwrite);

  if (!destinationPath) {
    return 1;
  }

  output.spinner('Fetching asset metadata...');

  let assets: ExportedAsset[];

  try {
    assets = await fetchAllAssets(client, projectId, flags.tag);
  } catch (error) {
    output.stopSpinner();
    output.error(error instanceof Error ? error.message : String(error));

    return 1;
  }

  const withFiles = assets.filter((asset) => asset.path);

  if (assets.length === 0) {
    output.stopSpinner();
    output.log(flags.tag ? `No assets found with tag "${flags.tag}".` : 'No assets found.');

    return 0;
  }

  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flexkit-assets-export-'));

  try {
    output.spinner(`Downloading ${withFiles.length} file${withFiles.length === 1 ? '' : 's'}...`);

    const downloads = await runWithConcurrency(withFiles, flags.concurrency, async (asset) => {
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

    const ndjson = withFiles.map((asset) => serializeAssetLine(asset, assetBundleFilename(asset))).join('\n');

    await fs.writeFile(path.join(stagingDir, 'assets.ndjson'), `${ndjson}\n`);

    output.spinner('Writing tarball...');
    await tar.create({ gzip: true, file: destinationPath, cwd: stagingDir }, ['assets.ndjson', 'files']);
    output.stopSpinner();
    output.log(`Exported ${withFiles.length} asset${withFiles.length === 1 ? '' : 's'} to ${destinationPath}`);

    return 0;
  } finally {
    output.stopSpinner();
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}
