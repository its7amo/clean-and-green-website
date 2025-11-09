const CACHE_NAME = 'clean-green-v2'; // Increment version to force update
const urlsToCache = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // NETWORK FIRST strategy for everything (fixes F5 cache issue)
  // Always try to fetch fresh data from network
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses (not API errors)
        if (response && response.status === 200) {
          // Don't cache API responses or HTML pages (they change frequently)
          const shouldCache = !url.pathname.startsWith('/api') && 
                             !url.pathname.endsWith('.html') &&
                             url.pathname !== '/';
          
          if (shouldCache) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache as fallback (offline support)
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache either, return offline page or error
          return new Response('Offline - please check your connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Force the active service worker to take control immediately
  return self.clients.claim();
});
