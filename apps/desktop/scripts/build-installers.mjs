#!/usr/bin/env node
/**
 * Packages the desktop app with electron-builder. The app's version is the
 * version of `@flexkit/studio` it bundles, so installers, npm and the hosted
 * Studio always line up; `--dir` only unpacks (no installers), the other
 * arguments go to electron-builder (for example `--publish always`).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const studio = JSON.parse(readFileSync(resolve(root, '../../packages/flexkit-studio/package.json'), 'utf8'));
const args = process.argv.slice(2);

const result = spawnSync(
  'pnpm',
  ['exec', 'electron-builder', '--config', 'electron-builder.yml', `--config.extraMetadata.version=${studio.version}`, ...args],
  { cwd: root, stdio: 'inherit' }
);

process.exit(result.status ?? 1);
