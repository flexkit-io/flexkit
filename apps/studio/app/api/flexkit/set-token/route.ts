// TODO: Simplify this so that the user does the minimum amount of work to get the auth wired up
// This might be handled by the [...path]/route.ts file in the future
export async function POST(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get('redirect') ?? '/';
  let body: { sid: string };

  try {
    body = await request.json();
  } catch (error) {
    body = { sid: '' };
  }

  return new Response('Redirecting...', {
    status: 307,
    headers: {
      'Set-Cookie': `sessionToken=${body.sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000;`,
      Location: redirect,
    },
  });
}
