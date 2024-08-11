export class APIError extends Error {
  status: number;
  serverMessage: string;
  [key: string]: any;

  constructor(message: string, response: Response, body?: object) {
    super();
    this.message = `${message} (${response.status})`;
    this.status = response.status;
    this.serverMessage = message;

    if (body) {
      for (const field of Object.keys(body)) {
        if (field !== 'message') {
          // @ts-ignore
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

interface InvalidLocalConfigMeta {
  value: string[];
}

export class InvalidLocalConfig extends CliError<'INVALID_LOCAL_CONFIG', InvalidLocalConfigMeta> {
  constructor(value: string[]) {
    super({
      code: 'INVALID_LOCAL_CONFIG',
      meta: { value },
      message: `Invalid local config parameter [${value
        .map((localConfig) => `"${localConfig}"`)
        .join(', ')}]. A string was expected.`,
    });
  }
}
