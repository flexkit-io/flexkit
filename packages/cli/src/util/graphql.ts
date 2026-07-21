import sleep from './sleep';
import type Client from './client';

export type GraphQLError = {
  message: string;
  [key: string]: unknown;
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: GraphQLError[];
};

const DEFAULT_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('socket')
  );
}

export function getProjectApiUrl(client: Client, projectId: string): string {
  return client.apiUrl.replace('https://', `https://${projectId}.`);
}

/**
 * Runs a GraphQL operation against a project's /graphql endpoint using
 * variables. GraphQL errors are returned in the response (never thrown), so
 * callers can decide how to handle partial failures. Network errors retry.
 */
export async function graphqlRequest<T>(
  client: Client,
  projectId: string,
  query: string,
  variables: { [key: string]: unknown } = {}
): Promise<GraphQLResponse<T>> {
  const url = `${getProjectApiUrl(client, projectId)}/graphql`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= DEFAULT_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: client.authConfig.token ?? '',
        },
        body: JSON.stringify({ query, variables }),
      });

      const bodyText = await response.text();
      let parsed: GraphQLResponse<T>;

      try {
        parsed = JSON.parse(bodyText) as GraphQLResponse<T>;
      } catch {
        throw new Error(`GraphQL HTTP ${response.status}: ${bodyText.slice(0, 500)}`);
      }

      // Constraint failures can arrive as HTTP 500 with a GraphQL errors body.
      if (!response.ok && !parsed.errors?.length) {
        throw new Error(`GraphQL HTTP ${response.status}: ${bodyText.slice(0, 500)}`);
      }

      return parsed;
    } catch (error) {
      lastError = error;

      if (attempt < DEFAULT_RETRIES && isRetryableNetworkError(error)) {
        client.output.debug(
          `GraphQL request failed (attempt ${attempt}/${DEFAULT_RETRIES}): ${
            error instanceof Error ? error.message : String(error)
          }. Retrying...`
        );
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export function formatGraphQLErrors(errors: GraphQLError[] | undefined): string {
  return (errors ?? []).map((error) => error.message).join('; ');
}

export function isConstraintErrorMessage(message: string): boolean {
  return message.toLowerCase().includes('constraint');
}
