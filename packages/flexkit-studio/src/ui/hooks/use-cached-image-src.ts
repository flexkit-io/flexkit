import { useEffect, useMemo, useState } from 'react';

type CacheEntry = {
  objectUrl: string;
  byteSize: number;
  lastUsedAt: number;
};

const MAX_CACHE_ENTRIES = 250;
const MAX_SINGLE_BLOB_BYTES = 2_500_000; // ~2.5MB

const blobUrlCache = new Map<string, CacheEntry>();
const inFlightLoads = new Map<string, Promise<void>>();
const corsBlockedUrls = new Set<string>();
const preloadedImages = new Map<string, HTMLImageElement>();

function ensurePreloaded(url: string): void {
  if (preloadedImages.has(url)) {
    return;
  }

  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  preloadedImages.set(url, img);
}

function touch(url: string): void {
  const entry = blobUrlCache.get(url);

  if (!entry) {
    return;
  }

  blobUrlCache.set(url, { ...entry, lastUsedAt: Date.now() });
}

function evictIfNeeded(): void {
  if (blobUrlCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const entries = Array.from(blobUrlCache.entries()).sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);
  const evictCount = Math.max(1, Math.ceil(MAX_CACHE_ENTRIES * 0.1));

  for (let i = 0; i < evictCount && i < entries.length; i += 1) {
    const [url, entry] = entries[i];
    blobUrlCache.delete(url);

    URL.revokeObjectURL(entry.objectUrl);
  }
}

async function loadToCache(url: string): Promise<void> {
  if (corsBlockedUrls.has(url)) {
    ensurePreloaded(url);

    return;
  }

  if (blobUrlCache.has(url)) {
    touch(url);

    return;
  }

  const existing = inFlightLoads.get(url);

  if (existing) {
    await existing;

    return;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url, {
        mode: 'cors',
        cache: 'force-cache',
      });

      if (!res.ok) {
        ensurePreloaded(url);

        return;
      }

      const blob = await res.blob();

      if (blob.size > MAX_SINGLE_BLOB_BYTES) {
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      blobUrlCache.set(url, { objectUrl, byteSize: blob.size, lastUsedAt: Date.now() });
      evictIfNeeded();
    } catch (err: unknown) {
      // Most common failure is CORS (TypeError: Failed to fetch). If so, avoid retrying.
      if (err instanceof TypeError) {
        corsBlockedUrls.add(url);
      }

      ensurePreloaded(url);
    }
  })();

  inFlightLoads.set(url, promise);

  await promise;

  inFlightLoads.delete(url);
}

/**
 * Keeps a stable, in-memory cached image src across virtualized unmount/remount cycles.
 * Falls back to the original URL if the image can’t be fetched (e.g. due to CORS).
 */
export function useCachedImageSrc(url: string | null | undefined): string | null {
  const initial = useMemo(() => {
    if (!url) {
      return null;
    }

    const cached = blobUrlCache.get(url);

    if (!cached) {
      return null;
    }

    touch(url);

    return cached.objectUrl;
  }, [url]);

  const [src, setSrc] = useState<string | null>(initial);

  useEffect(() => {
    if (!url) {
      setSrc(null);

      return;
    }

    if (corsBlockedUrls.has(url)) {
      ensurePreloaded(url);
      setSrc(null);

      return;
    }

    const cached = blobUrlCache.get(url);

    if (cached) {
      touch(url);
      setSrc(cached.objectUrl);

      return;
    }

    setSrc(null);
    let isStale = false;

    loadToCache(url).then(() => {
      const next = blobUrlCache.get(url);

      if (!next) {
        return;
      }

      if (isStale) {
        return;
      }

      touch(url);
      setSrc(next.objectUrl);
    });

    return () => {
      isStale = true;
    };
  }, [url]);

  return src;
}
