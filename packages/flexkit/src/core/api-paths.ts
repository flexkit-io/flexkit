const domain = 'api.flexkit.io';
const baseUrl = (projectId: string): string => `https://${projectId}.${domain}`;

interface ApiPaths {
  authProviders: string;
  sessionId: string;
  schema: string;
  currentUser: string;
  logout: (basePath: string) => string;
}

export function apiPaths(projectId: string): ApiPaths {
  return {
    authProviders: `${baseUrl(projectId)}/auth/providers`,
    sessionId: `${baseUrl(projectId)}/auth/session`,
    schema: `/api/flexkit/${projectId}/schema`,
    currentUser: `/api/flexkit/${projectId}/users/me`,
    logout: (basePath: string) => `/api/flexkit/${projectId}/auth/logout?redirect=/${basePath}/${projectId}`,
  };
}
