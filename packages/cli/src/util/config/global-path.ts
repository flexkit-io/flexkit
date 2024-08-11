import fs from 'fs';
import path from 'path';
import XDGAppPaths from 'xdg-app-paths';
import parseArguments from '../parse-args';

// Returns whether a directory exists
export function isDirectory(path: string): boolean {
  try {
    return fs.lstatSync(path).isDirectory();
  } catch (_) {
    // We don't care which kind of error occured, it isn't a directory anyway.
    return false;
  }
}

// Returns in which directory the config should be present
export default function getGlobalPathConfig(): string {
  let customPath: string | undefined;

  const argv = parseArguments(process.argv.slice(2));
  customPath = argv.flags['--global-config'];

  const flexkitDirectories = XDGAppPaths({ name: 'Flexkit' }).dataDirs();

  const possibleConfigPaths = [...flexkitDirectories];

  // The customPath flag is the preferred location,
  // followed by the Flexkit directory,
  // If none of those exist, use the Flexkit directory.
  return (
    (customPath && path.resolve(customPath)) ||
    possibleConfigPaths.find((configPath) => isDirectory(configPath)) ||
    flexkitDirectories[0]
  );
}
