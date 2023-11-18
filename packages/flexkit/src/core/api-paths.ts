const projectId = process.env.NEXT_PUBLIC_FLEXKIT_PROJECT_ID;
const domain = 'api.flexkit.io';
const baseUrl = `https://${projectId}.${domain}`;

export const apiPaths = {
  authProviders: `${baseUrl}/auth/providers`,
  sessionId: `${baseUrl}/auth/session`,
  currentUser: 'api/users/me',
  schema: `${baseUrl}/schema`,
  logout: `${baseUrl}/auth/logout`,
};
