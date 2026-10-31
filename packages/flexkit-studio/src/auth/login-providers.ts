export type Provider = {
  name: string;
  title: string;
  url: string;
  button: {
    variant: 'link' | 'default' | 'outline' | 'destructive' | 'ghost' | 'secondary';
    color: string;
    colorHover: string;
    backgroundColor: string;
    backgroundColorHover: string;
    iconUrl?: string;
  };
};

/** The login providers; any other answer (an error page, a proxy's JSON) is an error, never an empty list. */
export async function fetchProviders(url: string): Promise<Provider[]> {
  const response = await fetch(url, { mode: 'cors', credentials: 'same-origin' });
  const body = (await response.json().catch(() => null)) as { providers?: unknown } | null;

  if (!response.ok || !Array.isArray(body?.providers)) {
    throw new Error(`Login providers are unavailable (${String(response.status)})`);
  }

  return body.providers as Provider[];
}
