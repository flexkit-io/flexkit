import type { ErrorLike } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { getServerError, parseErrorBody } from './error-utils';

/**
 * Codes the backend puts on a request it refuses because of the member's
 * role or spaces. They arrive as HTTP 400 like a schema problem does, but
 * the schema is fine: the person asked for something they may not do.
 */
const ROLE_REFUSAL_CODES = new Set(['FORBIDDEN_DELETE', 'FORBIDDEN_FILTER']);

const ROLE_REFUSAL_FALLBACK = 'Your member role cannot perform this action.';
const SCHEMA_ERROR_FALLBACK =
  'A request to the project did not match its schema. Reload the page, and contact support if it keeps happening.';

/** One id for every role-refusal toast, so a caller that also reports the failure does not stack a second one. */
export const ROLE_REFUSAL_TOAST_ID = 'flexkit-role-refusal';

export type BadRequestOutcome =
  /** Show the server's sentence as an error toast; the schema banner stays down. */
  | { kind: 'role-refusal'; message: string }
  /** Raise the "Schema mismatch" banner, as every 400 did before. */
  | { kind: 'schema-error'; message: string };

/** The server's sentence when the FIRST GraphQL error carries a role-refusal code, otherwise null. */
function roleRefusalFromErrors(errors: unknown): string | null {
  if (!Array.isArray(errors)) {
    return null;
  }

  const [first] = errors as unknown[];

  if (!first || typeof first !== 'object') {
    return null;
  }

  const { extensions, message } = first as { extensions?: unknown; message?: unknown };
  const code = extensions && typeof extensions === 'object' ? (extensions as { code?: unknown }).code : undefined;

  if (typeof code !== 'string' || !ROLE_REFUSAL_CODES.has(code)) {
    return null;
  }

  return typeof message === 'string' && message.trim() ? message.trim() : ROLE_REFUSAL_FALLBACK;
}

/**
 * Decides what an HTTP 400 from the GraphQL route means for the person:
 * a refusal of their role (toast) or a request that does not fit the schema
 * (banner). Anything that is not clearly a role refusal stays a schema error.
 */
export function classifyBadRequest(bodyText: string | undefined): BadRequestOutcome {
  const responseBody = parseErrorBody<unknown>(bodyText);
  let message: string | null = null;

  if (responseBody && typeof responseBody === 'object') {
    const {
      error: responseError,
      errors,
      message: responseMessage,
    } = responseBody as {
      error?: unknown;
      errors?: unknown;
      message?: unknown;
    };
    const refusal = roleRefusalFromErrors(errors);

    if (refusal) {
      return { kind: 'role-refusal', message: refusal };
    }

    if (typeof responseMessage === 'string') {
      message = responseMessage;
    } else if (Array.isArray(errors)) {
      const [firstError] = errors as { message?: unknown }[];

      if (firstError && typeof firstError.message === 'string') {
        const { message: firstErrorMessage } = firstError;
        message = firstErrorMessage;
      }
    } else if (typeof responseError === 'string') {
      message = responseError;
    } else {
      message = JSON.stringify(responseBody);
    }
  } else {
    message = bodyText ?? null;
  }

  // `||`: an empty 400 body leaves '' here, which would hide the alert.
  return { kind: 'schema-error', message: message?.trim() || SCHEMA_ERROR_FALLBACK };
}

/**
 * The server's sentence when a failed operation was refused because of the
 * member's role, otherwise null. Covers both shapes the refusal can reach the
 * client in: an HTTP 400 with a JSON body, and parsed GraphQL errors.
 */
export function getRoleRefusalMessage(error?: ErrorLike | null): string | null {
  if (!error) {
    return null;
  }

  if (CombinedGraphQLErrors.is(error)) {
    return roleRefusalFromErrors(error.errors);
  }

  const serverError = getServerError(error);

  if (serverError?.statusCode !== 400) {
    return null;
  }

  const outcome = classifyBadRequest(serverError.bodyText);

  return outcome.kind === 'role-refusal' ? outcome.message : null;
}
