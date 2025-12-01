import type { ErrorLike } from '@apollo/client';
import { ServerError } from '@apollo/client/errors';

type ErrorWithCause = ErrorLike & { cause?: unknown };

function hasCause(error: ErrorLike): error is ErrorWithCause {
  if (!error) {
    return false;
  }

  return 'cause' in (error as ErrorWithCause);
}

export function getServerError(error?: ErrorLike): ServerError | null {
  if (!error) {
    return null;
  }

  if (ServerError.is(error)) {
    return error;
  }

  if (hasCause(error)) {
    const possibleServerError = error.cause;

    if (ServerError.is(possibleServerError)) {
      return possibleServerError;
    }
  }

  return null;
}

export function parseErrorBody<T>(bodyText: string | undefined): T | null {
  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText) as T;
  } catch {
    return null;
  }
}
