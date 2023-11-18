import { getToken } from '@flexkit/studio';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') ?? '';
  const token = 'test'; //await getToken(code);

  return new Response('Redirecting...', {
    status: 307,
    headers: {
      'Set-Cookie': `token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000;`,
      Location: '/', //TODO: redirect to the referer (the user might be logging in from any page, and must return to that page)
    },
  });
}
