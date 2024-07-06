import { getToken } from '@flexkit/studio/ssr';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') ?? '';
  const projectId = searchParams.get('projectId') ?? '';
  const token = await getToken(code, projectId);
  const redirect = searchParams.get('redirect') ?? '/';

  return new Response('Redirecting...', {
    status: 307,
    headers: {
      'Set-Cookie': `sessionToken=${token.sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000;`,
      Location: redirect,
    },
  });
}
