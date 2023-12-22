'use server';

import { apiPaths } from '../core/api-paths';

export async function getToken(code: string, projectId: string): Promise<{ sid: string }> {
  const token: { sid: string } = await fetch(new URL(apiPaths(projectId).sessionId).href, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  })
    .then((res) => res.json())
    .catch((_error) => {
      return '';
    });

  return token;
}
