const CACHE_NAME = 'mealtime-cache-v1';
const OFFLINE_URL = '/offline.html';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/offline.html',
  '/offline.css',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .catch(error => {
        console.error('[Service Worker] Failed to cache resources during install:', error);
        // Optionally, you could self.skipWaiting() or self.registration.unregister() here if you want to fail gracefully
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[Service Worker] Deleting old cache:', key);
          return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Bypass development server requests to avoid Service Worker interference
  if (url.origin.includes('localhost') || url.origin.includes('127.0.0.1')) {
    return; // Let the network handle development requests directly
  }
  
  // Bypass Supabase Auth requests to avoid CORS and Service Worker interference
  if (url.origin === 'https://zzvmyzyszsqptgyqwqwt.supabase.co') {
    return; // Let the network handle it directly
  }
  
  // Bypass Next.js internal requests to avoid corruption
  if (url.pathname.includes('/_next/') || url.pathname.includes('/api/')) {
    return; // Let the network handle Next.js internal requests
  }

  if (event.request.mode === 'navigate') {
    // Handle navigation requests: network first, fallback to offline.html
    event.respondWith(
      fetch(event.request)
        .then(response => response)
        .catch(() => caches.match(OFFLINE_URL, { ignoreSearch: true }))
    );
  } else {
    // Handle assets: stale-while-revalidate strategy
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
          // Always return a valid Response on error
          return new Response('Service Worker fetch error', { status: 500 });
        });
        // Return cached response immediately, update cache in background
        return cachedResponse || fetchPromise;
      })
    );
  }
}); 