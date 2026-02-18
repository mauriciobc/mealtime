const CACHE_NAME = 'mealtime-cache-v2';
const OFFLINE_URL = '/offline.html';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/offline.html',
  '/offline.css',
];

/**
 * Supabase Origin Configuration
 * 
 * This can be configured in two ways:
 * 1. Via global variable: Set `self.SUPABASE_ORIGIN` before service worker registration
 * 2. Via build-time replacement: The registration script will inject it from environment variables
 * 
 * Environment variable: NEXT_PUBLIC_SUPABASE_URL
 * Fallback: Production Supabase URL
 */
const SUPABASE_ORIGIN = (self.SUPABASE_ORIGIN || 'https://zzvmyzyszsqptgyqwqwt.supabase.co');

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache each asset individually to avoid complete failure if one fails
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => cache.add(url))
        );
      })
      .then(results => {
        // Log detailed results
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`[Service Worker] Successfully cached: ${ASSETS_TO_CACHE[index]}`);
          } else {
            console.warn(`[Service Worker] Failed to cache ${ASSETS_TO_CACHE[index]}:`, result.reason);
          }
        });
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`[Service Worker] Cache install completed: ${successful} successful, ${failed} failed`);
      })
      .catch(error => {
        console.error('[Service Worker] Failed to cache resources during install:', error);
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
  if (url.origin === SUPABASE_ORIGIN) {
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
            // Clone immediately while body is unused; use clone for cache, return original to client
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
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