import { readFile } from 'fs-extra';
import JSONparse from 'json-parse-better-errors';
import { CantParseJSONFile } from './error-types';
import { errorToString } from './error-utils';

export default async function readJSONFile<T>(file: string): Promise<T | null | CantParseJSONFile> {
  const content = await readFileSafe(file);
  if (content === null) {
    return content;
  }

  try {
    const json = JSONparse(content);

    return json;
  } catch (error) {
    return new CantParseJSONFile(file, errorToString(error));
  }
}

async function readFileSafe(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch (_) {
    return null;
  }
}
