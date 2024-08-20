import os from 'os';
import { getPackageJSON } from './pkg';

export default `${getPackageJSON().name} ${getPackageJSON().version} node-${
  process.version
} ${os.platform()} (${os.arch()})`;
