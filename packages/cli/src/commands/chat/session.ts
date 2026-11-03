import type Client from '../../util/client';
import { getApiErrorMessage, reportError } from '../../util/command-group';
import { isAPIError } from '../../util/error-utils';
import { getCommandName } from '../../util/pkg';

/**
 * Chat and Activity routes require a signed-in user (`permission: 'member'`):
 * project API tokens are refused with "A user session is required.".
 */
export function isSessionRequiredError(err: unknown): boolean {
  return isAPIError(err) && err.status === 403 && /user session is required/i.test(getApiErrorMessage(err));
}

/** `reportError` with a hint for API tokens, which cannot use these routes. */
export function reportSessionError(client: Client, err: unknown): number {
  if (isSessionRequiredError(err)) {
    client.output.stopSpinner();
    client.output.error(
      `This command acts as you, so it needs a login session; API tokens (FLEXKIT_TOKEN, --token flk-…) are not accepted. Run ${getCommandName(
        'login'
      )} and try again.`
    );

    return 1;
  }

  return reportError(client, err);
}
