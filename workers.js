// Retire le service worker et les caches des anciennes installations.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key === 'bieres-api-v1' || key.startsWith('my-pwa-cache-'))
      .map(key => caches.delete(key)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
