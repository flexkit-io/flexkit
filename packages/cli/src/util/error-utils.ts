import util from 'node:util';

/**
 * A simple type guard for objects.
 *
 * @param obj - A possible object
 */
export const isObject = (obj: unknown): obj is Record<string, unknown> => typeof obj === 'object' && obj !== null;

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
