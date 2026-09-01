export const FLEXKIT_TIMESTAMP_HEADER = 'flexkit-timestamp';
export const FLEXKIT_SIGNATURE_HEADER = 'flexkit-signature';
export const FLEXKIT_SIGNATURE_PREVIOUS_HEADER = 'flexkit-signature-previous';

export const CUSTOMER_TOOLS_SERVE_PATH = '/api/flexkit/tools';
export const CUSTOMER_TOOLS_HELLO_PATH = '/tools/dev-connect/hello';
export const CUSTOMER_TOOLS_POLL_PATH = '/tools/dev-connect/poll';
export const CUSTOMER_TOOLS_RESPOND_PATH = '/tools/dev-connect/respond';

const DEFAULT_MAX_SKEW_SECONDS = 300;

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw new Error('Web Crypto is not available.');
  }

  return subtle;
}

function encodeUtf8(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value);
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function timingSafeEqualBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

export function getUnixTimestampSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function buildSignaturePayload({
  body,
  method,
  path,
  timestamp,
}: {
  body: string;
  method: string;
  path: string;
  timestamp: number;
}): string {
  return `${timestamp.toString()}.${method.toUpperCase()}.${path}.${body}`;
}

export async function signPayload(secret: string, payload: string): Promise<string> {
  const key = await getSubtleCrypto().importKey(
    'raw',
    encodeUtf8(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  const signature = await getSubtleCrypto().sign('HMAC', key, encodeUtf8(payload));

  return `v1=${toBase64Url(signature)}`;
}

export async function createSignedHeaders({
  body,
  method,
  path,
  previousSecret,
  secret,
  timestamp = getUnixTimestampSeconds(),
}: {
  body: string;
  method: string;
  path: string;
  previousSecret?: string | null;
  secret: string;
  timestamp?: number;
}): Promise<{ [header: string]: string }> {
  const payload = buildSignaturePayload({ body, method, path, timestamp });
  const headers: { [header: string]: string } = {
    'Flexkit-Timestamp': timestamp.toString(),
    'Flexkit-Signature': await signPayload(secret, payload),
  };

  if (previousSecret) {
    headers['Flexkit-Signature-Previous'] = await signPayload(previousSecret, payload);
  }

  return headers;
}

function uniqueSecrets(secret: string | string[]): string[] {
  const values = Array.isArray(secret) ? secret : [secret];
  const unique: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (trimmed && !unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  }

  return unique;
}

function parseSignatureHeader(value: string): string | null {
  const trimmed = value.trim();

  if (trimmed.startsWith('v1=')) {
    return trimmed.slice(3);
  }

  return null;
}

export async function verifySignedHeaders({
  body,
  maxSkewSeconds = DEFAULT_MAX_SKEW_SECONDS,
  method,
  path,
  previousSignatureHeader,
  secret,
  signatureHeader,
  timestampHeader,
}: {
  body: string;
  maxSkewSeconds?: number;
  method: string;
  path: string;
  previousSignatureHeader?: string | null;
  secret: string | string[];
  signatureHeader: string | null;
  timestampHeader: string | null;
}): Promise<boolean> {
  const secrets = uniqueSecrets(secret);
  const signatureHeaders = [signatureHeader, previousSignatureHeader ?? null].filter(
    (value): value is string => Boolean(value)
  );

  if (secrets.length === 0 || signatureHeaders.length === 0 || !timestampHeader) {
    return false;
  }

  const timestamp = Number(timestampHeader);

  if (!Number.isInteger(timestamp)) {
    return false;
  }

  const now = getUnixTimestampSeconds();

  if (Math.abs(now - timestamp) > maxSkewSeconds) {
    return false;
  }

  const payload = buildSignaturePayload({ body, method, path, timestamp });

  for (const candidateSecret of secrets) {
    const expected = await signPayload(candidateSecret, payload);
    const expectedDigest = parseSignatureHeader(expected);

    if (!expectedDigest) {
      continue;
    }

    const expectedBytes = encodeUtf8(expectedDigest);

    for (const header of signatureHeaders) {
      const providedDigest = parseSignatureHeader(header);

      if (!providedDigest) {
        continue;
      }

      const providedBytes = encodeUtf8(providedDigest);

      if (providedBytes.length !== expectedBytes.length) {
        continue;
      }

      if (timingSafeEqualBytes(providedBytes, expectedBytes)) {
        return true;
      }
    }
  }

  return false;
}

export function getHeader(headers: Headers, name: string): string | null {
  return headers.get(name) ?? headers.get(name.toLowerCase());
}
