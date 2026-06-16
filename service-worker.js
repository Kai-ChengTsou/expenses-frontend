// Tommy Expense Service Worker
const CACHE_NAME = 'tommy-expense-cache-v1.0.19';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Skip waiting to ensure the new service worker activates immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Clear old caches when a new service worker activates
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - bypass cache for API requests and dynamic content
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip caching for Google Sheets API and Google Apps Script requests
  if (url.hostname.includes('google') || 
      url.hostname.includes('googleapis') || 
      url.pathname.includes('script.google.com')) {
    return;
  }
  
  // Skip caching for requests with cache-busting parameters
  if (url.search.includes('v=')) {
    return;
  }
  
  // For other requests, use network-first strategy
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
