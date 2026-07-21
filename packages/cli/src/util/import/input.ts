import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as tar from 'tar';

export type AssetMetadata = {
  _id: string;
  path?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  extension?: string | null;
  sha256?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  lqip?: string | null;
  tags?: string[];
  /** Bundle-relative path of the binary file (e.g. "files/<id>.jpg"). */
  _file?: string;
};

export type ImportInput = {
  /** Directory against which relative file references resolve. */
  baseDir: string;
  dataLines: string[];
  assetLines: string[];
  cleanup: () => Promise<void>;
};

function isTarball(filePath: string): boolean {
  return filePath.endsWith('.tar.gz') || filePath.endsWith('.tgz') || filePath.endsWith('.tar');
}

async function readLines(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, 'utf8');

  return content.split('\n').filter((line) => line.trim().length > 0);
}

async function readLinesIfExists(filePath: string): Promise<string[]> {
  try {
    return await readLines(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function hasBundleFiles(directory: string): Promise<boolean> {
  const exists = async (filename: string): Promise<boolean> => {
    try {
      await fs.access(path.join(directory, filename));

      return true;
    } catch {
      return false;
    }
  };

  return (await exists('data.ndjson')) || (await exists('assets.ndjson'));
}

/**
 * Returns the directory that actually holds the bundle files. Handles
 * tarballs created from a folder (e.g. `tar -czf out.tar.gz export-dir/`),
 * where everything sits inside a single top-level directory.
 */
async function findBundleRoot(directory: string): Promise<string> {
  if (await hasBundleFiles(directory)) {
    return directory;
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const subdirectories = entries.filter(
    (entry) => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== '__MACOSX'
  );

  if (subdirectories.length === 1) {
    const nested = path.join(directory, subdirectories[0].name);

    if (await hasBundleFiles(nested)) {
      return nested;
    }
  }

  return directory;
}

async function resolveDirectory(directory: string, cleanup: () => Promise<void>): Promise<ImportInput> {
  const bundleRoot = await findBundleRoot(directory);
  const dataLines = await readLinesIfExists(path.join(bundleRoot, 'data.ndjson'));
  const assetLines = await readLinesIfExists(path.join(bundleRoot, 'assets.ndjson'));

  if (dataLines.length === 0 && assetLines.length === 0) {
    await cleanup();

    throw new Error(`No data.ndjson or assets.ndjson found in ${directory}.`);
  }

  return { baseDir: bundleRoot, dataLines, assetLines, cleanup };
}

/**
 * Resolves the import input (NDJSON file, directory or tarball) into data and
 * asset lines plus the base directory for relative file references.
 */
export async function resolveImportInput(input: string, cwd: string): Promise<ImportInput> {
  const absolutePath = path.resolve(cwd, input);
  const stats = await fs.stat(absolutePath);
  const noCleanup = async (): Promise<void> => {
    /* nothing to clean up */
  };

  if (stats.isDirectory()) {
    return resolveDirectory(absolutePath, noCleanup);
  }

  if (isTarball(absolutePath)) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'flexkit-import-'));

    await tar.extract({ file: absolutePath, cwd: tempDir });

    return resolveDirectory(tempDir, async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });
  }

  const lines = await readLines(absolutePath);

  if (path.basename(absolutePath) === 'assets.ndjson') {
    return { baseDir: path.dirname(absolutePath), dataLines: [], assetLines: lines, cleanup: noCleanup };
  }

  return { baseDir: path.dirname(absolutePath), dataLines: lines, assetLines: [], cleanup: noCleanup };
}

export function parseAssetLines(lines: string[]): { assets: AssetMetadata[]; errors: string[] } {
  const assets: AssetMetadata[] = [];
  const errors: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    try {
      const parsed = JSON.parse(lines[index]) as AssetMetadata;

      if (typeof parsed._id !== 'string' || parsed._id.length === 0) {
        errors.push(`assets.ndjson line ${index + 1}: missing "_id".`);
        continue;
      }

      assets.push(parsed);
    } catch {
      errors.push(`assets.ndjson line ${index + 1}: invalid JSON.`);
    }
  }

  return { assets, errors };
}
