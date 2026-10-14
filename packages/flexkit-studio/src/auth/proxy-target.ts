import { USER_API_SEGMENT } from '../core/api-paths';
import { flexkitApiDomain, flexkitDomain } from '../core/domains';

export type ProxyTarget = {
  /** How the Studio session is forwarded: project routes read a cookie, user routes a bearer token. */
  auth: 'bearer' | 'cookie';
  url: string;
};

/**
 * Maps a BFF pathname to the Flexkit URL it proxies to.
 * `/api/flexkit/<projectId>/x` → `https://<projectId>.api.<domain>/x`
 * `/api/flexkit/-/x`           → `https://<domain>/api/x` (user-level)
 */
export function resolveProxyTarget(pathname: string, search = ''): ProxyTarget {
  const [, , , segment = ''] = pathname.split('/');

  if (segment === USER_API_SEGMENT) {
    const rest = pathname.replace(`/api/flexkit/${USER_API_SEGMENT}`, '');

    return { auth: 'bearer', url: `https://${flexkitDomain}/api${rest}${search}` };
  }

  const path = pathname.replace(`/api/flexkit/${segment}`, '');

  return { auth: 'cookie', url: `https://${segment}.${flexkitApiDomain}${path}${search}` };
}
