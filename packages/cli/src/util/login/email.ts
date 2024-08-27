import { AccountNotFound, InvalidEmail } from '../error-types';
import sleep from '../sleep';
import { highlightOutput } from '../output/highlight';
import eraseLines from '../output/erase-lines';
import type Client from '../client';
import { errorToString, isAPIError } from '../error-utils';
import type { LoginData, LoginResult } from './types';

export default async function doEmailLogin(client: Client, email: string): Promise<LoginResult> {
  let verificationToken;
  const { output } = client;

  output.spinner('Sending you an email');

  try {
    const data = await executeLogin(client, email);
    verificationToken = data.token;
  } catch (err: unknown) {
    output.error(errorToString(err));

    return 1;
  }

  // Clear up `Sending email` success message
  output.print(eraseLines(1));
  output.print(`We sent an email to ${highlightOutput(email)}. Please follow the steps provided inside it.\n`);
  output.spinner('Waiting for your confirmation');

  let result;

  while (!result) {
    try {
      await sleep(2000);
      result = await verifyLogin(client, email, verificationToken);
    } catch (err: unknown) {
      if (!isAPIError(err) || err.serverMessage !== 'Confirmation incomplete') {
        output.error(errorToString(err));

        return 1;
      }
    }
  }

  if ('error' in result) {
    output.error(result.error.message);

    return 1;
  }

  output.success(`Email authentication complete for ${email}`);

  return {
    sid: result.sid,
    email,
  };
}

async function executeLogin(client: Client, email: string): Promise<LoginData> {
  try {
    const url = new URL('/auth/login/otp', client.authUrl);

    return await client.fetch<LoginData>(url.href, {
      method: 'POST',
      body: { email },
    });
  } catch (err: unknown) {
    if (isAPIError(err)) {
      if (err.code === 'not_exists') {
        throw new AccountNotFound(email, `Please sign up: https://flexkit.io/signup`);
      }

      if (err.code === 'invalid_email') {
        throw new InvalidEmail(email, err.message);
      }
    }

    throw new Error(`Unexpected error: ${errorToString(err)}`);
  }
}

type VerifyLoginResult =
  | { sid: string }
  | {
      error: {
        message: string;
        code: 'bad_request';
      };
    };

async function verifyLogin(client: Client, email: string, token: string): Promise<VerifyLoginResult> {
  const url = new URL('/auth/confirm-otp-login', client.authUrl);
  url.searchParams.set('email', email);
  url.searchParams.set('token', token);

  return await client.fetch<VerifyLoginResult>(url.href);
}
