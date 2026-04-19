export function normalizeBasePath(basePath?: string): string {
  if (!basePath || basePath === '/') {
    return '/';
  }

  const normalizedPath = basePath.replace(/^\/+|\/+$/g, '');

  return `/${normalizedPath}`;
}

export function joinBasePath(basePath: string, ...segments: string[]): string {
  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedSegments = segments.flatMap((segment) => segment.split('/')).filter(Boolean);

  if (normalizedSegments.length === 0) {
    return normalizedBasePath;
  }

  if (normalizedBasePath === '/') {
    return `/${normalizedSegments.join('/')}`;
  }

  return `${normalizedBasePath}/${normalizedSegments.join('/')}`;
}
