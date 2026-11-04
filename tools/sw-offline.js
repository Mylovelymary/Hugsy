/* СОХРАНЁННАЯ ВЕРСИЯ ОФЛАЙН-КЕША — сейчас НЕ используется.

   Офлайн-кеш выключен 2026-11-04: пока сайт активно правится, он застревал
   у людей на телефонах, и человек несколько заходов видел старую версию.
   Этот файл лежит здесь, чтобы вернуть офлайн одним движением перед запуском:
   скопировать поверх `sw.js`, поднять VERSION и включить регистрацию в `app.js`
   (там переменная OFFLINE_CACHE). Сам по себе он никуда не подключён.

/* Офлайн-кеш. Стратегия: сначала кеш, потом сеть — страницы открываются мгновенно и без интернета.
   При изменении файлов поднимай VERSION, иначе у пользователя останется старая версия. */

var VERSION = 'hugsy-v22';
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
   браузер отдавал бы старые CSS и JS из кеша. Здесь только боевая стратегия.

   Два разных подхода, и это важно:
   • страницы, скрипты, стили и данные — СНАЧАЛА СЕТЬ, кеш как запасной вариант.
     Раньше было наоборот, и после выкладки человек ещё несколько заходов видел
     старую версию: кеш отдавался мгновенно, а свежее подтягивалось «в фоне»
     и показывалось только в следующий раз.
   • шрифты и картинки — сначала кеш: они не меняются, а весят больше всего.
   Офлайн работает в обоих случаях: нет сети — отдаём то, что сохранено. */
function putInCache(req, res) {
  if (!res || !res.ok) return res;
  var copy = res.clone();
  caches.open(VERSION).then(function (c) { c.put(req, copy); }).catch(function () {});
  return res;
}

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  var alwaysFresh = e.request.mode === 'navigate' ||
                    /\.(html|js|css|webmanifest)$/.test(url.pathname) ||
                    url.pathname === '/' || url.pathname.slice(-1) === '/';

  if (alwaysFresh) {
    e.respondWith(
      fetch(e.request).then(function (res) { return putInCache(e.request, res); })
        .catch(function () {
          return caches.match(e.request).then(function (hit) {
            return hit || caches.match('index.html');
          });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) { return putInCache(e.request, res); });
    })
  );
});
