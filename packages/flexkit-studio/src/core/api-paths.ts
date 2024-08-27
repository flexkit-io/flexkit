const domain = 'flexkit.io';
const baseUrl = (projectId?: string): string =>
  projectId ? `https://${projectId}.api.${domain}` : `https://${domain}`;

interface ApiPaths {
  authProviders: string;
  currentUser: string;
  logout: (basePath: string) => string;
  search: string;
  sessionId: string;
}

export function apiPaths(projectId = ''): ApiPaths {
  return {
    authProviders: `${baseUrl(projectId)}/auth/providers`,
    currentUser: `/api/flexkit/${projectId}/users/me`,
    logout: (basePath: string) => `/api/flexkit/${projectId}/auth/logout?redirect=/${basePath}/${projectId}`,
    search: `/api/flexkit/${projectId}/search`,
    sessionId: `${baseUrl(projectId)}/api/auth/login/session`,
  };
}
