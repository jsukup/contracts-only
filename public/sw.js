// Service Worker for ContractsOnly
// Implements caching strategies for better performance

const CACHE_NAME = 'contractsonly-v1.0.0'
const STATIC_CACHE = 'contractsonly-static-v1.0.0'
const DYNAMIC_CACHE = 'contractsonly-dynamic-v1.0.0'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/jobs',
  '/dashboard',
  '/manifest.json',
  '/_next/static/css/app/layout.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/webpack.js',
  '/icon-192x192.png',
  '/icon-512x512.png'
]

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/jobs',
  '/api/profile',
  '/api/skills'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Different strategies for different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API routes: Network first, cache fallback
    event.respondWith(networkFirstStrategy(request))
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets: Cache first
    event.respondWith(cacheFirstStrategy(request))
  } else if (STATIC_ASSETS.includes(url.pathname)) {
    // App routes: Stale while revalidate
    event.respondWith(staleWhileRevalidateStrategy(request))
  } else {
    // Other routes: Network first
    event.respondWith(networkFirstStrategy(request))
  }
})

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request) {
  try {
    const cache = await caches.open(STATIC_CACHE)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error)
    return new Response('Offline', { status: 503 })
  }
}

// Network-first strategy (for API routes and dynamic content)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url)
    
    const cache = await caches.open(DYNAMIC_CACHE)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || new Response('Offline', { 
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      })
    }
    
    return new Response('Offline', { status: 503 })
  }
}

// Stale while revalidate strategy (for app routes)
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  // Fetch from network in the background
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  }).catch((error) => {
    console.log('[SW] Network failed for stale-while-revalidate:', error)
  })
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Otherwise wait for network response
  try {
    return await networkResponsePromise
  } catch (error) {
    return new Response('Offline', { status: 503 })
  }
}

// Background sync for failed API requests
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'job-application') {
    event.waitUntil(syncJobApplications())
  }
})

// Sync failed job applications when back online
async function syncJobApplications() {
  try {
    const cache = await caches.open('pending-requests')
    const requests = await cache.keys()
    
    for (const request of requests) {
      try {
        await fetch(request)
        await cache.delete(request)
        console.log('[SW] Synced pending request:', request.url)
      } catch (error) {
        console.log('[SW] Failed to sync request:', request.url, error)
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: data.url,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'view' && event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    )
  }
})

// Message handler for cache invalidation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('contractsonly-')) {
              return caches.delete(cacheName)
            }
          })
        )
      })
    )
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME })
  }
})