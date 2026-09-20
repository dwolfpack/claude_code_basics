/* Retired worker for the old Shadow Step path.
   Clears the caches it left behind, unregisters itself, and reloads any open
   window so the redirect page is fetched from the network. */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) { /* ignore */ }
    try { await self.registration.unregister(); } catch (e) { /* ignore */ }
    try {
      const windows = await self.clients.matchAll({ type: 'window' });
      windows.forEach((c) => c.navigate(c.url));
    } catch (e) { /* ignore */ }
  })());
});
/* No fetch handler: every request goes straight to the network. */
