// Service Worker para PWA
const CACHE_NAME = 'controle-maconico-v1'
const urlsToCache = [
  '/',
  '/login',
  '/admin',
  '/admin/reports',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
]

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
  )
})

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retornar do cache se disponível
        if (response) {
          return response
        }

        // Caso contrário, fazer requisição
        return fetch(event.request)
          .then((response) => {
            // Não cachear respostas que não são do mesmo origin
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Cachear novas respostas
            const responseToCache = response.clone()
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })

            return response
          })
      })
  )
})

// Notificações push (se implementadas no futuro)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    }
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/')
  )
})