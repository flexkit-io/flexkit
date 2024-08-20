import { URL } from 'node:url';
import type Client from '../client';
import doOauthLogin from './oauth';
import type { LoginResult } from './types';

export default function doGoogleLogin(client: Client, outOfBand?: boolean): Promise<LoginResult> {
  const url = new URL('/auth/login/google', 'https://flexkit.io');

  return doOauthLogin(client, url, 'Google', outOfBand);
}
