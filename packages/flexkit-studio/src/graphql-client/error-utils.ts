import type { ErrorLike } from '@apollo/client';
import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

type ErrorWithCause = ErrorLike & { cause?: unknown };
type ErrorWithMessage = {
  message?: unknown;
};
type ServerErrorWithResult = ServerError & {
  result?: unknown;
};
type GraphQLErrorResponse = {
  error?: unknown;
  errors?: unknown;
  message?: unknown;
};
type GraphQLErrorItem = {
  extensions?: {
    code?: unknown;
  };
  message?: unknown;
};

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

function getErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const { message } = error as ErrorWithMessage;

  return typeof message === 'string' ? message : null;
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

export function getGraphQLSchemaMismatchMessage(error?: ErrorLike): string | null {
  if (!error) {
    return null;
  }

  const messages = getGraphQLValidationMessages(error);

  if (messages.length === 0) {
    return null;
  }

  return [
    'The deployed schema is out of sync with your local Flexkit schema.',
    'Run `flexkit deploy` using the CLI to apply your latest schema changes.',
    ...messages.map((message) => `- ${message}`),
  ].join('\n');
}

function getGraphQLValidationMessages(error: ErrorLike): string[] {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.filter(isSchemaValidationError).map(({ message }) => message);
  }

  const directMessage = getErrorMessage(error);

  if (directMessage && isSchemaValidationMessage(directMessage)) {
    return [directMessage];
  }

  const serverError = getServerError(error);

  if (serverError?.statusCode !== 400) {
    return [];
  }

  const responseBody =
    parseErrorBody<GraphQLErrorResponse>(serverError.bodyText) ??
    getServerErrorResult(serverError) ??
    getErrorCauseResponse(error);

  if (!responseBody) {
    return [];
  }

  if (Array.isArray(responseBody.errors)) {
    return responseBody.errors.filter(isSchemaValidationError).map((item) => item.message);
  }

  if (typeof responseBody.message === 'string' && isSchemaValidationMessage(responseBody.message)) {
    return [responseBody.message];
  }

  if (typeof responseBody.error === 'string' && isSchemaValidationMessage(responseBody.error)) {
    return [responseBody.error];
  }

  return [];
}

function getServerErrorResult(serverError: ServerError): GraphQLErrorResponse | null {
  const { result } = serverError as ServerErrorWithResult;

  if (!result || typeof result !== 'object') {
    return null;
  }

  return result as GraphQLErrorResponse;
}

function getErrorCauseResponse(error: ErrorLike): GraphQLErrorResponse | null {
  if (!hasCause(error)) {
    return null;
  }

  const { cause } = error;
  const causeMessage = getErrorMessage(cause);

  if (causeMessage && isSchemaValidationMessage(causeMessage)) {
    return { message: causeMessage };
  }

  if (!cause || typeof cause !== 'object') {
    return null;
  }

  const { result } = cause as { result?: unknown };

  if (result && typeof result === 'object') {
    return result as GraphQLErrorResponse;
  }

  return null;
}

function isSchemaValidationError(error: unknown): error is GraphQLErrorItem & { message: string } {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { extensions, message } = error as GraphQLErrorItem;
  const code = extensions?.code;

  if (code === 'GRAPHQL_VALIDATION_FAILED' && typeof message === 'string') {
    return true;
  }

  return typeof message === 'string' && isSchemaValidationMessage(message);
}

function isSchemaValidationMessage(message: string): boolean {
  return (
    message.startsWith('Cannot query field ') ||
    message.startsWith('Unknown type ') ||
    message.startsWith('Cannot query field "') ||
    message.includes('GRAPHQL_VALIDATION_FAILED')
  );
}
