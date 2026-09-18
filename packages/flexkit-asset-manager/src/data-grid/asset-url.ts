const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

export type AssetUrlFields = {
  mimeType?: string | null;
  originalFilename?: string | null;
  path?: string | null;
  url?: string | null;
};

function getFilenameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const segment = pathname.split('/').pop();

    return segment || pathname;
  } catch {
    const [pathname] = url.split('?');

    return pathname;
  }
}

export function getAssetFilename(asset: AssetUrlFields): string {
  if (asset.originalFilename) {
    return asset.originalFilename;
  }

  if (asset.path) {
    return asset.path;
  }

  if (asset.url) {
    return getFilenameFromUrl(asset.url);
  }

  return '';
}

export function getExtensionFromAsset(asset: AssetUrlFields): string {
  const filename = getAssetFilename(asset);
  const [clean] = filename.split('?');
  const parts = clean.split('.');

  if (parts.length > 1) {
    return parts.pop()!.toLowerCase();
  }

  return 'file';
}

export function isImageAsset(asset: AssetUrlFields): boolean {
  if (asset.mimeType) {
    return asset.mimeType.startsWith('image/');
  }

  return IMAGE_EXTENSION.test(getAssetFilename(asset));
}

export function getAssetImageUrl(url: string, size?: { height: number; width: number }): string {
  if (!url || !size) {
    return url;
  }

  if (getFilenameFromUrl(url).toLowerCase().endsWith('.svg')) {
    return url;
  }

  const params = new URLSearchParams({
    f: 'webp',
    h: String(size.height),
    w: String(size.width),
  });
  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}${params.toString()}`;
}
