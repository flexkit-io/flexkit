import util from 'node:util';
import { APIError } from './error-types';

/**
 * A simple type guard for objects.
 *
 * @param obj - A possible object
 */
export const isObject = (obj: unknown): obj is { [key: string]: unknown } => typeof obj === 'object' && obj !== null;

/**
 * A type guard for `try...catch` errors.
 */
export const isError = (error: unknown): error is Error => {
  return util.types.isNativeError(error);
};

interface ErrorLike {
  message: string;
  name?: string;
  stack?: string;
}

/**
 * A type guard for error-like objects.
 */
export const isErrorLike = (error: unknown): error is ErrorLike => isObject(error) && 'message' in error;

/**
 * Parses errors to string, useful for getting the error message in a
 * `try...catch` statement.
 */
export const errorToString = (error: unknown, fallback?: string): string => {
  if (isError(error) || isErrorLike(error)) return error.message;

  if (typeof error === 'string') return error;

  return fallback ?? 'An unknown error has ocurred.';
};

export const isErrnoException = (error: unknown): error is NodeJS.ErrnoException => {
  return isError(error) && 'code' in error;
};

/**
 * Normalizes unknown errors to the Error type, useful for working with errors
 * in a `try...catch` statement.
 */
export const normalizeError = (error: unknown): Error => {
  if (isError(error)) return error;

  const errorMessage = errorToString(error);

  // Copy over additional properties if the object is error-like.
  return isErrorLike(error) ? Object.assign(new Error(errorMessage), error) : new Error(errorMessage);
};

/**
 * The message an API error body carries. Routes answer in different shapes:
 * `{ errorMessage: string | string[] | { message }[] }` (automations, skills),
 * `{ error: string | { message } }` and `{ message }` (deploy). This is the one
 * place that reads them, so every command shows the same text for a response.
 */
export function getErrorBodyMessage(body: unknown): string | null {
  if (!isObject(body)) {
    return null;
  }

  const { errorMessage, error, message } = body;

  if (typeof errorMessage === 'string' && errorMessage) {
    return errorMessage;
  }

  if (Array.isArray(errorMessage) && errorMessage.length > 0) {
    return errorMessage
      .map((entry) => (isObject(entry) && typeof entry.message === 'string' ? entry.message : String(entry)))
      .join('\n');
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  if (isObject(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }

  return typeof message === 'string' && message ? message : null;
}

export default async function responseError(res: Response, fallbackMessage: string | null = null): Promise<APIError> {
  let body: unknown;

  if (!res.ok) {
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
  }

  let details: object | undefined;

  if (isObject(body)) {
    details = isObject(body.error) ? { ...body, ...body.error } : body;
  }

  return new APIError(getErrorBodyMessage(body) ?? fallbackMessage ?? 'Response Error', res, details);
}

export function isAPIError(v: unknown): v is APIError {
  return isError(v) && 'status' in v;
}
