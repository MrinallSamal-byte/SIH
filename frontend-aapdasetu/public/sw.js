// AapdaSetu Resilient Disaster Service Worker
const CACHE_NAME = 'aapdasetu-v4'
const API_CACHE_NAME = 'aapdasetu-api-v1'
const TILE_CACHE_NAME = 'aapdasetu-tiles-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
]

// Basemap tile hosts cached cache-first so maps render offline (FIFO capped).
const TILE_HOST_PATTERN = /^mt[0-3]\.google\.com$|^([abc]\.)?tile\.openstreetmap\.org$|^tile\.opentopomap\.org$|^([abcd]\.)?basemaps\.cartocdn\.com$|^server\.arcgisonline\.com$/
const TILE_CACHE_LIMIT = 300
const API_CACHE_LIMIT = 100

function trimCacheFifo(cache, limit) {
  return cache.keys().then((keys) => {
    if (keys.length <= limit) return undefined
    const excess = keys.slice(0, keys.length - limit)
    return Promise.all(excess.map((key) => cache.delete(key)))
  })
}

function trimTileCache(cache) {
  return trimCacheFifo(cache, TILE_CACHE_LIMIT)
}

function trimApiCache(cache) {
  return trimCacheFifo(cache, API_CACHE_LIMIT)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME && key !== TILE_CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    )
  )
  self.clients.claim()
})

// Background Sync (Chromium): nudge any open AapdaSetu tab to flush the global
// submission outbox. If no client responds within 3s we do nothing — page-side
// initGlobalOutboxSync() covers the next launch instead.
self.addEventListener('sync', (event) => {
  if (event.tag !== 'aapdasetu-outbox') return
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        // A client can close between matchAll() and postMessage — never let
        // that reject the waitUntil promise.
        try {
          client.postMessage({ type: 'OUTBOX_FLUSH' })
        } catch (_) {
          // client gone — page-side initGlobalOutboxSync covers next launch
        }
      })
      return new Promise((resolve) => setTimeout(resolve, 3000))
    })
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Network-first with cache fallback for same-origin public API GETs only.
  // Non-GET requests are never cached or served from cache — writes must hit
  // the server (or fail into the page-side outbox).
  if (
    event.request.method === 'GET' &&
    url.origin === self.location.origin &&
    url.pathname.startsWith('/api/v1/')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache ONLY complete same-origin 200s — never error/opaque bodies.
          if (response && response.status === 200) {
            const copy = response.clone()
            caches
              .open(API_CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .then(() => caches.open(API_CACHE_NAME).then(trimApiCache))
          }
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Cache-first for basemap tiles so maps render offline, FIFO-capped.
  if (event.request.method === 'GET' && TILE_HOST_PATTERN.test(url.hostname)) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached
          return fetch(event.request)
            .then((response) => {
              if (response && (response.ok || response.type === 'opaque')) {
                const copy = response.clone()
                cache.put(event.request, copy).then(() => trimTileCache(cache))
              }
              return response
            })
            .catch(() => cache.match(event.request))
        })
      )
    )
    return
  }

  // Skip non-GET requests and remaining backend/AI endpoints
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/ai/')) {
    return
  }

  // Network-First for Navigation / HTML requests so new deployments are served immediately
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => cached || caches.match('/index.html'))
        })
    )
    return
  }

  // Cache-First with Network-Fallback for immutable versioned assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          // Only cache valid asset files
          if (url.pathname.startsWith('/assets/')) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // If offline and navigating, return cached shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html')
          }
        })
    })
  )
})
