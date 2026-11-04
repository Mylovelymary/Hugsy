/* Самоудаляющийся Service Worker.

   Офлайн-кеш выключен 2026-11-04 по решению автора: пока сайт активно правится,
   он застревал у людей на телефонах — человек заходил и видел прошлую версию.
   Этот файл не кеширует ничего. Его единственная задача — убрать за старым
   работником: стереть все его кеши, отменить регистрацию и перезагрузить
   открытые вкладки, чтобы они сразу получили свежие файлы из сети.

   Браузер проверяет обновление самого sw.js при каждом заходе, поэтому
   выключатель доезжает даже туда, где всё намертво закешировано.

   Вернуть офлайн перед запуском: взять `tools/sw-offline.js`, скопировать
   поверх этого файла, поднять VERSION и включить OFFLINE_CACHE в `app.js`. */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (clients) {
        clients.forEach(function (c) {
          // Вкладка перезагружается один раз и дальше работает напрямую с сетью
          if (c.navigate) c.navigate(c.url);
        });
      })
      .catch(function () {})
  );
});

/* Обработчика fetch здесь нет намеренно: все запросы идут в сеть напрямую. */
