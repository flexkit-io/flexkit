#!/usr/bin/env node
/**
 * Packages the desktop app with electron-builder. The app's version is the
 * version of `@flexkit/studio` it bundles, so installers, npm and the hosted
 * Studio always line up; `--dir` only unpacks (no installers), the other
 * arguments go to electron-builder (for example `--publish always`).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const studio = JSON.parse(readFileSync(resolve(root, '../../packages/flexkit-studio/package.json'), 'utf8'));
const args = process.argv.slice(2);

// electron-builder is run through Node directly: spawning `pnpm` fails on
// Windows without a shell (`pnpm.cmd`), and a shell would re-parse arguments.
const electronBuilder = createRequire(import.meta.url).resolve('electron-builder/cli.js');

// An empty signing variable (a secret that is not set) would be taken for a
// certificate path; only the variables with a value reach electron-builder.
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ''));

const result = spawnSync(
  process.execPath,
  [electronBuilder, '--config', 'electron-builder.yml', `--config.extraMetadata.version=${studio.version}`, ...args],
  { cwd: root, env, stdio: 'inherit' }
);

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
