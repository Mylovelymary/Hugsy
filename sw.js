/* Офлайн-кеш. Стратегия: сначала кеш, потом сеть — страницы открываются мгновенно и без интернета.
   При изменении файлов поднимай VERSION, иначе у пользователя останется старая версия. */

var VERSION = 'hugsy-v21';
var ASSETS = [
  'index.html',
  'quiz.html',
  'tracker.html',
  'routine.html',
  'resources.html',
  'close.html',
  'sensory.html',
  'panic/index.html',
  'panic/list.html',
  'panic/ex.html',
  'themes.html',
  'assets/css/style.css',
  'assets/js/app.js',
  'assets/js/quiz.js',
  'assets/js/tracker.js',
  'assets/js/routine.js',
  'assets/js/resources.js',
  'assets/js/themes.js',
  'assets/js/panic.js',
  'assets/js/sensory.js',
  'assets/img/penguin.webp',
  'assets/img/goose.webp',
  'assets/img/raccoon.webp',
  'assets/img/together.webp',
  'assets/img/mark.webp',
  'assets/img/icon-192.webp',
  'assets/img/icon-512.webp',
  'assets/img/apple-touch-icon.png',
  'assets/fonts/manrope-cyrillic.woff2',
  'assets/fonts/manrope-latin.woff2',
  'assets/fonts/inter-cyrillic.woff2',
  'assets/fonts/inter-latin.woff2',
  'data/quiz-data.js',
  'data/table-templates.js',
  'data/resources.js',
  'data/patterns.js',
  'data/panic-data.js',
  'data/icons.js',
  'manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) { return c.addAll(ASSETS); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === VERSION ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* На localhost этот файл вообще не регистрируется (см. app.js) — иначе при разработке
   браузер отдавал бы старые CSS и JS из кеша. Здесь только боевая стратегия. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) {
        // Тихо обновляем кеш в фоне, если сеть есть.
        fetch(e.request).then(function (res) {
          if (res && res.ok) caches.open(VERSION).then(function (c) { c.put(e.request, res); });
        }).catch(function () {});
        return hit;
      }
      return fetch(e.request).catch(function () { return caches.match('index.html'); });
    })
  );
});
