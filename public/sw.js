const CACHE_NAME = 'steampunk-maps-cache-v1';
const MAPS_PATH_PREFIX = '/maps/';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return undefined;
          }),
        ),
      ),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (!url.pathname.startsWith(MAPS_PATH_PREFIX)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch((error) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          throw error;
        });

      if (cachedResponse) {
        event.waitUntil(networkFetch);
        return cachedResponse;
      }

      return networkFetch;
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting' && self.skipWaiting) {
    self.skipWaiting();
  }
});
