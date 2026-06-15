const CACHE_NAME = 'sentinel-cache-v2' // Incremented version to clear old cache
const ASSETS_TO_CACHE = [
  '/health',
  '/manifest.webmanifest'
]

// Install Event: Cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    }).then(() => self.skipWaiting())
  )
})

// Activate Event: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch Event: Network-First falling back to Cache strategy for pages, Stale-While-Revalidate for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests and local same-origin assets
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // Skip Next.js API/Server Action requests, admin/cms database queries or dynamic paths we want fresh
  // Also skip root and login which handle auth redirects
  if (
    url.pathname === '/' ||
    url.pathname === '/login' ||
    url.pathname.includes('/_next/') || 
    url.pathname.startsWith('/api/') || 
    url.pathname.startsWith('/dashboard') || 
    url.pathname.startsWith('/editor')
  ) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh version in background (Stale-While-Revalidate)
        fetch(request).then((networkResponse) => {
          // Do not cache redirected responses or non-200 responses
          if (networkResponse.status === 200 && !networkResponse.redirected) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse))
          }
        }).catch(() => { /* Ignore network errors */ })

        return cachedResponse
      }

      return fetch(request).catch(() => {
        // Offline fallback for main pages
        return caches.match('/')
      })
    })
  )
})
