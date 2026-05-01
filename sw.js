
// Self-destructing Service Worker
// This ensures any previously installed SW is immediately removed and stops controlling the page.
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach(client => client.navigate(client.url));
    });
});
