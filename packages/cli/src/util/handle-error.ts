import bytes from 'bytes';
import { info } from './output';
import { errorOutput } from './output/error';
import type { APIError } from './error-types';
import { getCommandName } from './pkg';

export function handleError(err: unknown, { debug = false } = {}): void {
  let error = err;

  // Coerce Strings to Error instances
  if (typeof error === 'string') {
    error = new Error(error);
  }

  const apiError = error as APIError;
  const { message, stack, status, code, sizeLimit } = apiError;

  // consider changing API of handleError to include `client.output`
  // to use `output.debug`
  if (debug) {
    // eslint-disable-next-line no-console -- CLI output
    console.error(`> [debug] handling error: ${stack ?? ''}`);
  }

  if (message === 'User force closed the prompt with 0 null') {
    return;
  }

  if (status === 403) {
    // eslint-disable-next-line no-console -- CLI output
    console.error(errorOutput(message || `Authentication error. Run ${getCommandName('login')} to log-in again.`));
  } else if (status === 429) {
    // Rate limited: display the message from the server-side,
    // which contains more details
    // eslint-disable-next-line no-console -- CLI output
    console.error(errorOutput(message));
  } else if (code === 'size_limit_exceeded') {
    // eslint-disable-next-line no-console -- CLI output
    console.error(errorOutput(`File size limit exceeded (${bytes(sizeLimit as number)}).`));
  } else if (message) {
    // eslint-disable-next-line no-console -- CLI output
    console.error(errorOutput(message));
  } else if (status === 500) {
    // eslint-disable-next-line no-console -- CLI output
    console.error(errorOutput('Unexpected server error. Please retry.'));
  } else if (code === 'USER_ABORT') {
    info('Canceled');
  } else {
    // eslint-disable-next-line no-console -- CLI output
    console.error(errorOutput(`Unexpected error. Please try again later. (${message})`));
  }
}
