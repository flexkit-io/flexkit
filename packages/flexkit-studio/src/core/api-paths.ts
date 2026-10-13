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
