import fs from 'node:fs';
import path from 'node:path';
import type { PackageJson } from 'type-fest';

const cache = new Map();

function getPackageJSONPath(dir: string): string {
  return path.join(dir, 'package.json');
}

function captureCallerCallSite(): NodeJS.CallSite {
  const _prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;

  const callSites = new Error().stack as unknown as NodeJS.CallSite[];
  const [, , callSite] = callSites;
  Error.prepareStackTrace = _prepareStackTrace;

  return callSite;
}

function getPackageJSON(): PackageJson {
  const callSite = captureCallerCallSite();
  // Get the file name of where this function was called. It is guaranteed that
  // the only way for `getFileName` to return `undefined` is if this function is
  // called using `eval` thus it is safe to assert `filePath` is defined at this
  // point.
  const filePath = callSite.getFileName() ?? callSite.getEvalOrigin() ?? '';

  let rootDir = path.dirname(filePath);
  let packageJSONPath = getPackageJSONPath(rootDir);

  while (!fs.existsSync(packageJSONPath)) {
    rootDir = path.join(rootDir, '..');
    packageJSONPath = getPackageJSONPath(rootDir);
  }

  let packageJSON = cache.get(packageJSONPath);

  if (!packageJSON) {
    packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
    cache.set(packageJSONPath, packageJSON);
  }

  return packageJSON as PackageJson;
}

export default getPackageJSON();
