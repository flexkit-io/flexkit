import path from 'path';
import { InvalidLocalConfig } from '../error-types';
import parseArguments from '../../util/parse-args';

export default function getLocalPathConfig(prefix: string) {
  let customPath: string | undefined;

  const argv = parseArguments(process.argv.slice(2), {}, { permissive: true });
  customPath = argv.flags['--local-config'];

  // If `--local-config` flag was specified, then that takes priority
  if (customPath) {
    if (typeof customPath !== 'string') {
      throw new InvalidLocalConfig(customPath);
    }

    return path.resolve(prefix, customPath);
  }

  // Otherwise check for `flexkit.json`.
  const configPath = path.join(prefix, 'flexkit.json');

  return configPath;
}
