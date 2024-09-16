import type { Response } from 'node-fetch';

export class APIError extends Error {
  status: number;
  serverMessage: string;
  [key: string]: unknown;

  constructor(message: string, response: Response, body?: object) {
    super();
    this.message = `${message} (${response.status.toString()})`;
    this.status = response.status;
    this.serverMessage = message;

    if (body) {
      for (const field of Object.keys(body)) {
        if (field !== 'message') {
          // @ts-expect-error -- body could be anything
          this[field] = body[field];
        }
      }
    }
  }
}

export class CliError<Code, Meta> extends Error {
  code: Code;
  meta: Meta;

  constructor({ code, message, meta }: { code: Code; message: string; meta: Meta }) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

interface InvalidProjectConfigMeta {
  error: string;
  file: string;
}

export class InvalidProjectConfig extends CliError<'INVALID_PROJECT_CONFIG', InvalidProjectConfigMeta> {
  constructor(error: string, file: string) {
    const message = 'Invalid project configuration. Please check your flexkit.config.[js|ts|jsx|tsx] file.';
    super({
      code: 'INVALID_PROJECT_CONFIG',
      meta: { error, file },
      message,
    });
  }
}

export class CantParseJSONFile extends CliError<'CANT_PARSE_JSON_FILE', { file: string; parseErrorLocation: string }> {
  constructor(file: string, parseErrorLocation: string) {
    const message = `Can't parse json file ${file}: ${parseErrorLocation}`;
    super({
      code: 'CANT_PARSE_JSON_FILE',
      meta: { file, parseErrorLocation },
      message,
    });
  }
}

export class CantFindConfig extends CliError<'CANT_FIND_CONFIG', { paths: string[] }> {
  constructor(paths: string[]) {
    super({
      code: 'CANT_FIND_CONFIG',
      meta: { paths },
      message: `Can't find a configuration file in the given locations.`,
    });
  }
}

export class WorkingDirectoryDoesNotExist extends CliError<'CWD_DOES_NOT_EXIST', object> {
  constructor() {
    super({
      code: 'CWD_DOES_NOT_EXIST',
      meta: {},
      message: 'The current working directory does not exist.',
    });
  }
}

export class AccountNotFound extends CliError<'ACCOUNT_NOT_FOUND', { email: string }> {
  constructor(email: string, message = `Please sign up: https://flexkit.io/signup`) {
    super({
      code: 'ACCOUNT_NOT_FOUND',
      message,
      meta: { email },
    });
  }
}

export class InvalidEmail extends CliError<'INVALID_EMAIL', { email: string }> {
  constructor(email: string, message = 'Invalid Email') {
    super({
      code: 'INVALID_EMAIL',
      message,
      meta: { email },
    });
  }
}
