import http from 'node:http';
import { URL } from 'node:url';
import open from 'open';
import { listen } from 'async-listen';
import isDocker from 'is-docker';
import type Client from '../client';
import { highlightOutput } from '../output/highlight';
import link from '../output/link';
import eraseLines from '../output/erase-lines';
import verify from './verify';
import { readInput } from './utils';
import type { LoginResult } from './types';

export default async function doOauthLogin(
  client: Client,
  url: URL,
  provider: string,
  outOfBand = isHeadless()
): Promise<LoginResult> {
  const getVerificationToken = outOfBand ? getVerificationTokenOutOfBand : getVerificationTokenInBand;

  const loginResult = await getVerificationToken(client, url, provider);

  if (typeof loginResult === 'number') {
    return loginResult;
  }

  if (!('verificationToken' in loginResult)) {
    return 1;
  }

  const { output } = client;
  output.spinner('Verifying authentication token');
  const verificationResult = await verify(client, loginResult.verificationToken, provider);
  output.success(`${provider} authentication complete for ${highlightOutput(verificationResult.email)}`);

  return verificationResult;
}

/**
 * Get the verification token "in-band" by spawning a localhost
 * HTTP server that gets redirected to as the OAuth callback URL.
 *
 * This method is preferred since it doesn't require additional
 * user interaction, however it only works when the web browser
 * is on the same machine as the localhost HTTP server (so doesn't
 * work over SSH, for example).
 */
async function getVerificationTokenInBand(
  client: Client,
  url: URL,
  provider: string
): Promise<number | { verificationToken: string }> {
  const { output } = client;
  const server = http.createServer();
  const { port } = await listen(server, 0, '127.0.0.1');
  url.searchParams.set('origin', `http://localhost:${port}`);

  output.log(`Please visit the following URL in your web browser:`);
  output.log(link(url.href));
  output.spinner(`Waiting for ${provider} authentication to be completed`);

  try {
    const [query] = await Promise.all([
      new Promise<URL['searchParams']>((resolve, reject) => {
        server.once('request', (req, res) => {
          // Close the HTTP connection to prevent
          // `server.close()` from hanging
          res.setHeader('connection', 'close');

          const queryString = new URL(req.url ?? '/', 'http://localhost').searchParams;
          resolve(queryString);

          // Redirect the user's web browser back to
          // the Vercel CLI login notification page
          const location = new URL('https://flexkit.io/notifications/cli-login-');
          const loginError = queryString.get('loginError');

          if (loginError) {
            location.pathname += 'failed';
            location.searchParams.set('loginError', loginError);
          } else {
            location.pathname += 'success';
            const email = queryString.get('email');

            if (email) {
              location.searchParams.set('email', email);
            }
          }

          res.statusCode = 302;
          res.setHeader('location', location.href);
          res.end();
        });
        server.once('error', reject);
      }),
      open(url.href),
    ]);

    output.stopSpinner();
    output.print(eraseLines(3));

    const loginError = query.get('loginError');

    if (loginError) {
      const err = JSON.parse(loginError);
      output.prettyError(err);

      return 1;
    }

    const verificationToken = query.get('code');

    if (!verificationToken) {
      output.error('Verification token was not provided. Please contact support.');

      return 1;
    }

    return { verificationToken };
  } finally {
    server.close();
  }
}

/**
 * Get the verification token "out-of-band" by presenting the login URL
 * to the user and directing them to visit the URL in their web browser.
 *
 * A prompt is rendered asking for the verification token that is
 * provided to them in the callback URL after the login is successful.
 */
async function getVerificationTokenOutOfBand(client: Client, url: URL): Promise<{ verificationToken: string }> {
  const { output } = client;
  url.searchParams.set('mode', 'oob');
  output.log(`Please visit the following URL in your web browser:`);
  output.log(link(url.href));
  output.print('\n');
  output.log(`After login is complete, enter the verification code printed in your browser.`);
  const verificationToken = await readInput(client, 'Verification code:');
  output.print(eraseLines(6));

  return { verificationToken };
}

/**
 * Attempts to detect whether CLI is running inside a "headless"
 * environment, such as inside a Docker container or in an SSH
 * session.
 */
function isHeadless(): boolean {
  return isDocker() || isSSH();
}

function isSSH(): boolean {
  return Boolean(process.env.SSH_CLIENT ?? process.env.SSH_TTY);
}
