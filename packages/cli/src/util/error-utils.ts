import util from 'node:util';
import type { Response } from 'node-fetch';
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

export default async function responseError(res: Response, fallbackMessage = null): Promise<APIError> {
  let bodyError;

  if (!res.ok) {
    let body: { error: { message: string } } | undefined;

    try {
      body = (await res.json()) as { error: { message: string } };
    } catch (err) {
      // body = '';
    }

    bodyError = body ? body.error : {};
  }

  const msg = bodyError?.message ?? fallbackMessage ?? 'Response Error';

  return new APIError(msg, res, bodyError);
}

export function isAPIError(v: unknown): v is APIError {
  return isError(v) && 'status' in v;
}
