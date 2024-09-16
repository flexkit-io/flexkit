const domain = 'flexkit.io';
export const baseApiUrl = `https://${domain}`;
const baseProjectApiUrl = (projectId?: string): string =>
  projectId ? `https://${projectId}.api.${domain}` : baseApiUrl;

interface ApiPaths {
  authProviders: string;
  completion: string;
  currentUser: string;
  loginOtpConfirm: string;
  loginOtpSend: string;
  logout: (basePath: string) => string;
  search: string;
  sessionId: string;
}

export function apiPaths(projectId = ''): ApiPaths {
  return {
    authProviders: `${baseProjectApiUrl(projectId)}/auth/providers`,
    completion: `/api/flexkit/${projectId}/completion`,
    currentUser: `/api/flexkit/${projectId}/users/me`,
    loginOtpConfirm: `${baseProjectApiUrl(projectId)}/auth/otp/confirm`,
    loginOtpSend: `${baseProjectApiUrl(projectId)}/auth/otp/send`,
    logout: (basePath: string) => `/api/flexkit/${projectId}/auth/logout?redirect=/${basePath}/${projectId}`,
    search: `/api/flexkit/${projectId}/search`,
    sessionId: `${baseProjectApiUrl(projectId)}/api/auth/login/session`,
  };
}
