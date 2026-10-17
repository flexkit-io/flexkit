/*
 * Flexkit Studio service worker (hosted Studio only). It shows Activity
 * notifications pushed while no Studio tab is open, and opens the item when
 * one is clicked. It does no caching.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'Flexkit Studio';
  const url = typeof payload.url === 'string' ? payload.url : '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === 'string' ? payload.body : '',
      data: { url },
      icon: '/android-chrome-192x192.png',
      // Same tag as the in-tab notification, so a browser shows one of the two.
      tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = new URL(event.notification.data?.url ?? '/', self.location.origin);

  // Only ever open this Studio's own pages.
  if (target.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      const existing = windows.find((client) => new URL(client.url).origin === target.origin);

      if (existing) {
        await existing.focus();

        // navigate() only works on tabs this worker controls; open a new one otherwise.
        try {
          if (await existing.navigate(target.href)) {
            return;
          }
        } catch {
          // Fall through to a new window.
        }
      }

      await self.clients.openWindow(target.href);
    })()
  );
});
