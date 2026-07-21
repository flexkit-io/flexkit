import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getProjectApiUrl } from '../graphql';
import { mimeTypeFromFilename, mimeTypeFromResponse } from './mime';
import type Client from '../client';

export type AssetRecord = {
  _id: string;
  path: string | null;
  mimeType: string | null;
  originalFilename: string | null;
  extension: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  lqip: string | null;
  sha256: string | null;
  deduped: boolean;
};

export type UploadSource = {
  /** Local absolute path or http(s) URL. */
  source: string;
  isUrl: boolean;
  filename: string;
};

export type IdStrategy = 'random' | 'filename' | 'hash';

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

async function collectFromDirectory(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.name.startsWith('.')) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFromDirectory(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Expands the input arguments (files, directories, URLs) into a flat list of
 * upload sources. Directories are walked recursively; dotfiles are skipped.
 */
export async function collectUploadSources(inputs: string[], cwd: string): Promise<UploadSource[]> {
  const sources: UploadSource[] = [];

  for (const input of inputs) {
    if (isHttpUrl(input)) {
      const pathname = new URL(input).pathname;
      const filename = decodeURIComponent(pathname.split('/').pop() || 'file.bin');

      sources.push({ source: input, isUrl: true, filename });
      continue;
    }

    const absolutePath = path.resolve(cwd, input);
    const stats = await fs.stat(absolutePath);

    if (stats.isDirectory()) {
      const files = await collectFromDirectory(absolutePath);

      for (const file of files) {
        sources.push({ source: file, isUrl: false, filename: path.basename(file) });
      }

      continue;
    }

    sources.push({ source: absolutePath, isUrl: false, filename: path.basename(absolutePath) });
  }

  return sources;
}

export async function readSource(source: UploadSource): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!source.isUrl) {
    const buffer = await fs.readFile(source.source);

    return { buffer, mimeType: mimeTypeFromFilename(source.filename) };
  }

  const response = await fetch(source.source);

  if (!response.ok) {
    throw new Error(`Failed to download ${source.source} (HTTP ${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = mimeTypeFromResponse(response.headers.get('content-type'), source.filename);

  return { buffer, mimeType };
}

export function deriveAssetId(strategy: IdStrategy, source: UploadSource, buffer: Buffer): string | undefined {
  if (strategy === 'filename') {
    return source.filename.replace(/\.[A-Za-z0-9]+$/, '');
  }

  if (strategy === 'hash') {
    return createHash('sha256').update(buffer).digest('hex');
  }

  return undefined;
}

/**
 * Uploads a buffer to the project's one-shot /assets endpoint, which stores
 * the blob and creates the _asset node (deduped by content hash).
 */
export async function uploadAssetBuffer(
  client: Client,
  projectId: string,
  buffer: Buffer,
  options: { mimeType: string; filename: string; assetId?: string }
): Promise<AssetRecord> {
  const params = new URLSearchParams({ filename: options.filename });

  if (options.assetId) {
    params.set('assetId', options.assetId);
  }

  const url = `${getProjectApiUrl(client, projectId)}/assets?${params.toString()}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': options.mimeType,
      Authorization: client.authConfig.token ?? '',
    },
    body: new Uint8Array(buffer),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Asset upload failed for ${options.filename} (HTTP ${response.status}): ${bodyText.slice(0, 300)}`);
  }

  return JSON.parse(bodyText) as AssetRecord;
}

/**
 * Uploads a single source (file or URL) and returns the created asset.
 */
export async function uploadSource(
  client: Client,
  projectId: string,
  source: UploadSource,
  options: { idStrategy?: IdStrategy; assetId?: string } = {}
): Promise<AssetRecord> {
  const { buffer, mimeType } = await readSource(source);
  const assetId = options.assetId ?? deriveAssetId(options.idStrategy ?? 'random', source, buffer);

  return uploadAssetBuffer(client, projectId, buffer, {
    mimeType,
    filename: source.filename,
    assetId,
  });
}
