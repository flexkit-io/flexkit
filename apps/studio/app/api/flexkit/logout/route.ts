export function GET(): Response {
  return new Response('logging out...', {
    status: 307,
    headers: {
      'Set-Cookie': `sessionToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0;`,
      Location: '/', //TODO: get the redirect path via a query param (it cna be anything, e.g.: /studio)
    },
  });
}
