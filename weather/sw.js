// The "service worker" is a little helper that runs in the background.
// It keeps a copy of the app's own files so the app opens even with no internet.
const CACHE = 'thornton-weather-v1';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.json',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

// When installed: save the app files.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// When a new version takes over: delete old saved copies.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// When the app asks for one of its own files: try the internet first, fall back to the saved copy.
// (Weather data itself is saved by app.js, so we leave those requests alone.)
self.addEventListener('fetch', e => {
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
