import { URL } from 'node:url';
import type Client from '../client';
import doOauthLogin from './oauth';
import type { LoginResult } from './types';

export default function doBitbucketLogin(client: Client, outOfBand?: boolean): Promise<LoginResult> {
  const url = new URL('/auth/login/bitbucket', client.authUrl);

  return doOauthLogin(client, url, 'Bitbucket', outOfBand);
}
