'use server';

import { apiPaths } from '../core/api-paths';

export async function getToken(code: string, projectId = ''): Promise<{ sid: string }> {
  const url = new URL(apiPaths(projectId).sessionId);
  url.searchParams.set('code', code);

  const token: { sid: string } = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then((res) => res.json())
    .catch((_error: unknown) => {
      return '';
    });

  return token;
}
