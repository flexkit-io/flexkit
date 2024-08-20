import { URL } from 'node:url';
import { hostname } from 'node:os';
import type Client from '../client';
import { getPackageName } from '../pkg';
import type { LoginResultSuccess } from './types';

export default function verify(
  client: Client,
  verificationToken: string,
  provider: string
): Promise<LoginResultSuccess> {
  const url = new URL('/auth/login/session', 'https://flexkit.io');
  url.searchParams.set('code', verificationToken);

  // Set the "name" of the Token that will be created
  const hyphens = /-/g;
  const host = hostname().replace(hyphens, ' ').replace('.local', '');
  const tokenName = `${getPackageName()} on ${host} via ${provider}`;
  url.searchParams.set('tokenName', tokenName);

  return client.fetch<LoginResultSuccess>(url.href);
}
