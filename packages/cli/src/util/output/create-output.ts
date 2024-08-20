import type * as tty from 'node:tty';
import { inspect } from 'node:util';
import chalk, { type Chalk } from 'chalk';
import * as ansiEscapes from 'ansi-escapes';
import { supportsHyperlink as detectSupportsHyperlink } from 'supports-hyperlinks';
import { errorToString } from '../error-utils';
import { removeEmoji } from '../emoji';
import renderLink from './link';
import wait, { type StopSpinner } from './wait';

const IS_TEST = process.env.NODE_ENV === 'test';

export interface OutputOptions {
  debug?: boolean;
  supportsHyperlink?: boolean;
  noColor?: boolean;
}

export interface LogOptions {
  color?: Chalk;
}

interface LinkOptions {
  color?: false | ((text: string) => string);
  fallback?: false | (() => string);
}

export class Output {
  stream: tty.WriteStream;
  debugEnabled: boolean;
  supportsHyperlink: boolean;
  colorDisabled: boolean;
  private spinnerMessage: string;
  private _spinner: StopSpinner | null;

  constructor(
    stream: tty.WriteStream,
    {
      debug: debugEnabled = false,
      supportsHyperlink = detectSupportsHyperlink(stream),
      noColor = false,
    }: OutputOptions = {}
  ) {
    this.stream = stream;
    this.debugEnabled = debugEnabled;
    this.supportsHyperlink = supportsHyperlink;
    this.spinnerMessage = '';
    this._spinner = null;

    this.colorDisabled = getNoColor(noColor);
    if (this.colorDisabled) {
      chalk.level = 0;
    }
  }

  isDebugEnabled = (): boolean => {
    return this.debugEnabled;
  };

  print = (str: string): void => {
    let text = str;

    if (this.colorDisabled) {
      text = removeEmoji(text);
    }

    this.stopSpinner();
    this.stream.write(text);
  };

  log = (str: string, color = chalk.grey): void => {
    this.print(`${color('>')} ${str}\n`);
  };

  dim = (str: string, color = chalk.grey): void => {
    this.print(`${color(`> ${str}`)}\n`);
  };

  warn = (str: string): void => {
    this.print(chalk.yellow(chalk.bold('WARN! ') + str));
    this.print('\n');
  };

  note = (str: string): void => {
    this.log(chalk`{yellow.bold NOTE:} ${str}`);
  };

  error = (str: string): void => {
    this.print(`${chalk.red(`Error:`)} ${str}\n`);
  };

  prettyError = (err: unknown): void => {
    this.error(errorToString(err));
  };

  ready = (str: string): void => {
    this.print(`${chalk.cyan('> Ready!')} ${str}\n`);
  };

  success = (str: string): void => {
    this.print(`${chalk.cyan('> Success!')} ${str}\n`);
  };

  congratulations = (str: string): void => {
    this.print(`${chalk.cyan('> Congratulations!')} ${str}\n`);
  };

  debug = (debug: unknown): void => {
    if (this.debugEnabled) {
      this.log(`${chalk.bold('[debug]')} ${chalk.gray(`[${new Date().toISOString()}]`)} ${debugToString(debug)}`);
    }
  };

  spinner = (message: string, delay = 300): void => {
    if (this.debugEnabled) {
      this.debug(`Spinner invoked (${message}) with a ${delay.toString()}ms delay`);

      return;
    }

    if (IS_TEST || !this.stream.isTTY) {
      this.print(`${message}\n`);

      return;
    }

    this.spinnerMessage = message;

    if (this._spinner) {
      this._spinner.text = message;

      return;
    }

    this._spinner = wait(
      {
        text: message,
        stream: this.stream,
      },
      delay
    );
  };

  stopSpinner = (): void => {
    if (this.debugEnabled && this.spinnerMessage) {
      const msg = `Spinner stopped (${this.spinnerMessage})`;
      this.spinnerMessage = '';
      this.debug(msg);
    }
    if (this._spinner) {
      this._spinner();
      this._spinner = null;
      this.spinnerMessage = '';
    }
  };

  time = async <T>(label: string | ((r?: T) => string), fn: Promise<T> | (() => Promise<T>)): Promise<T> => {
    const promise = typeof fn === 'function' ? fn() : fn;

    if (this.debugEnabled) {
      const startLabel = typeof label === 'function' ? label() : label;
      this.debug(startLabel);
      const start = Date.now();
      const r = await promise;
      const endLabel = typeof label === 'function' ? label(r) : label;
      const duration = Date.now() - start;
      const durationPretty = duration < 1000 ? `${duration.toString()}ms` : `${(duration / 1000).toFixed(2)}s`;
      this.debug(`${endLabel} ${chalk.gray(`[${durationPretty}]`)}`);

      return r;
    }

    return promise;
  };

  /**
   * Returns an ANSI formatted hyperlink when support has been enabled.
   */
  link = (text: string, url: string, { fallback, color = chalk.cyan }: LinkOptions = {}): string => {
    // Based on https://github.com/sindresorhus/terminal-link (MIT license)
    if (!this.supportsHyperlink) {
      // If the fallback has been explicitly disabled, don't modify the text itself
      if (fallback === false) {
        return renderLink(text);
      }

      return typeof fallback === 'function' ? fallback() : `${text} (${renderLink(url)})`;
    }

    return ansiEscapes.link(color ? color(text) : text, url);
  };
}

function getNoColor(noColorArg: boolean | undefined): boolean {
  // FORCE_COLOR: the standard supported by chalk https://github.com/chalk/chalk#supportscolor
  // NO_COLOR: the standard we want to support https://no-color.org/
  // noColorArg: the `--no-color` arg passed to the CLI command
  const noColor = process.env.FORCE_COLOR === '0' || process.env.NO_COLOR === '1' || noColorArg;

  return Boolean(noColor);
}

function debugToString(debug: unknown): string {
  if (typeof debug === 'string') {
    return debug;
  }

  return inspect(debug);
}
