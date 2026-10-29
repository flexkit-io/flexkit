import { flexkitDomain } from './domains';

const domain = flexkitDomain;
export const baseApiUrl = `https://${domain}`;
const baseProjectApiUrl = (projectId?: string): string =>
  projectId ? `https://${projectId}.api.${domain}` : baseApiUrl;

interface ApiPaths {
  assets: string;
  authProviders: string;
  completion: string;
  currentUser: string;
  loginOtpConfirm: string;
  loginOtpSend: string;
  /** `redirectPath` is the absolute in-app path to return to after logout. */
  logout: (redirectPath: string) => string;
  /** Deployed project schema, scopes, spaces, title and menu groups. */
  schema: string;
  search: string;
  sessionId: string;
}

export const IMAGES_BASE_URL = `${baseApiUrl}/images/`;

/**
 * Reserved BFF segment for user-level (project-less) Flexkit API calls:
 * `/api/flexkit/-/me` is proxied to `https://<flexkitDomain>/api/me` with the
 * session as a bearer token. Project ids are ten characters, so `-` can never
 * collide with one.
 */
export const USER_API_SEGMENT = '-';

export const userApiPaths = {
  authProviders: `/api/flexkit/${USER_API_SEGMENT}/auth/providers`,
  /** POST: Studio error reports (see core/error/error-reporter.ts). */
  clientErrors: `/api/flexkit/${USER_API_SEGMENT}/client-errors`,
  logout: `/api/flexkit/${USER_API_SEGMENT}/auth/logout`,
  /** POST: product events only Studio sees (see core/analytics/product-events.ts). */
  productEvents: `/api/flexkit/${USER_API_SEGMENT}/product-events`,
  /** Signed-in user plus every project they can open. */
  me: `/api/flexkit/${USER_API_SEGMENT}/me`,
  /** The signed-in user's notification preferences (desktop kinds, approval email). */
  notificationPreferences: `/api/flexkit/${USER_API_SEGMENT}/me/notification-preferences`,
  /** Web Push: GET the VAPID public key, POST or DELETE this browser's subscription. */
  push: `/api/flexkit/${USER_API_SEGMENT}/me/push`,
  otpConfirm: `/api/flexkit/${USER_API_SEGMENT}/auth/otp/confirm`,
  otpSend: `/api/flexkit/${USER_API_SEGMENT}/auth/otp/send`,
} as const;

export function apiPaths(projectId = ''): ApiPaths {
  return {
    assets: `/api/flexkit/${projectId}/assets`,
    authProviders: `/api/flexkit/${projectId}/auth/providers`,
    completion: `/api/flexkit/${projectId}/completion`,
    currentUser: `/api/flexkit/${projectId}/users/me`,
    loginOtpConfirm: `${baseProjectApiUrl(projectId)}/auth/otp/confirm`,
    loginOtpSend: `${baseProjectApiUrl(projectId)}/auth/otp/send`,
    logout: (redirectPath: string) => {
      const params = new URLSearchParams({ redirect: redirectPath });

      return `/api/flexkit/${projectId}/auth/logout?${params.toString()}`;
    },
    schema: `/api/flexkit/${projectId}/schema`,
    search: `/api/flexkit/${projectId}/search`,
    sessionId: `${baseProjectApiUrl(projectId)}/api/auth/login/session`,
  };
}
