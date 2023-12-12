'use server';

import { apiPaths } from '../core/api-paths';

export async function getToken(code: string): Promise<{ sid: string }> {
  const token: { sid: string } = await fetch(new URL(apiPaths.sessionId).href, {
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
