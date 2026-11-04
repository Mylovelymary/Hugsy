/* Hugsy — общий слой: темы, маскот, хранилище, мелкие утилиты.
   Без модулей и без зависимостей: страница должна работать и через file://. */

/* ---------------- Хранилище ---------------- */
var Store = {
  pre: 'png.',
  get: function (key, fallback) {
    try {
      var raw = localStorage.getItem(this.pre + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set: function (key, value) {
    try {
      localStorage.setItem(this.pre + key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Переполнение или приватный режим — молча не падаем, но предупреждаем.
      toast('Не удалось сохранить: в браузере нет места');
      return false;
    }
  },
  del: function (key) {
    try { localStorage.removeItem(this.pre + key); } catch (e) {}
  }
};

/* ---------------- Меню «Ещё» на телефоне ---------------- */
function initNavMore() {
  var btn = document.querySelector('.nav-more');
  var nav = document.querySelector('.nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // Клик мимо меню — закрыть
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target)) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ---------------- Профиль ----------------
   Возраст меняет рекомендации (подростку — не то же, что взрослому),
   обращение — род глаголов. Оба поля необязательны. */
function getProfile() { return Store.get('profile', { age: '', gender: '' }); }
function setProfile(p) { Store.set('profile', p); }

/* G('ответил', 'ответила', 'Спасибо за честность') — нейтральный вариант
   пишем живой фразой без рода, а не «ответил(а)». */
function G(m, f, n) {
  var g = getProfile().gender;
  return g === 'm' ? m : (g === 'f' ? f : n);
}

/* ---------------- Темы ---------------- */
var THEMES = [
  { id: 'ice',    name: 'Лёд',         cls: 't-ice' },
  { id: 'cocoa',  name: 'Какао',       cls: 't-cocoa' },
  { id: 'sakura', name: 'Сакура',      cls: 't-sakura' },
  { id: 'night',  name: 'Ночь',        cls: 't-night' },
  { id: 'quiet',  name: 'Тихий режим', cls: 't-quiet' }
];

function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  Store.set('theme', id);
  if (typeof applyWallpaper === 'function') applyWallpaper();
  var dots = document.querySelectorAll('.theme-dot');
  for (var i = 0; i < dots.length; i++) {
    dots[i].setAttribute('aria-pressed', dots[i].dataset.theme === id ? 'true' : 'false');
  }
}

function initThemes() {
  var host = document.querySelector('.themes');
  if (!host) return;
  var current = Store.get('theme', 'ice');
  var html = '';
  for (var i = 0; i < THEMES.length; i++) {
    var t = THEMES[i];
    html += '<button type="button" class="theme-dot ' + t.cls + '" data-theme="' + t.id +
            '" title="Тема: ' + t.name + '" aria-label="Тема: ' + t.name + '" aria-pressed="false"></button>';
  }
  host.innerHTML = html;
  host.addEventListener('click', function (e) {
    var b = e.target.closest('.theme-dot');
    if (b) applyTheme(b.dataset.theme);
  });
  applyTheme(current);
}

/* Тему ставим как можно раньше, чтобы не мигало светлым на тёмной теме. */
(function () {
  try {
    var saved = localStorage.getItem('png.theme');
    if (saved) document.documentElement.setAttribute('data-theme', JSON.parse(saved));
  } catch (e) {}
})();

/* ---------------- Закрытое тестирование (PIN-код) ---------------- */
var ACCESS_PIN = '9999';

function isPinAuthenticated() {
  try {
    var params = new URLSearchParams(location.search);
    var urlPin = params.get('pin') || (location.hash ? location.hash.replace(/^#/, '') : '');
    if (urlPin === ACCESS_PIN) {
      Store.set('pin_auth', true);
      if (params.has('pin')) {
        params.delete('pin');
        var q = params.toString();
        history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
      }
      return true;
    }
  } catch (e) {}
  return Store.get('pin_auth', false) === true;
}

/* Ставим блокировку до отрисовки страницы, чтобы контент не мигал */
(function () {
  try {
    var saved = localStorage.getItem('png.pin_auth');
    var isAuth = saved && JSON.parse(saved) === true;
    var params = new URLSearchParams(location.search);
    var urlPin = params.get('pin') || (location.hash ? location.hash.replace(/^#/, '') : '');
    if (!isAuth && urlPin !== ACCESS_PIN) {
      document.documentElement.classList.add('pin-locked');
    }
  } catch (e) {}
})();

function initPinGate() {
  if (isPinAuthenticated()) {
    document.documentElement.classList.remove('pin-locked');
    return;
  }
  document.documentElement.classList.add('pin-locked');

  var gate = document.createElement('div');
  gate.id = 'pin-gate';
  gate.className = 'pin-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-label', 'Вход в закрытое тестирование');

  gate.innerHTML =
    '<div class="pin-card card">' +
      '<div class="pin-peng" id="pin-peng">' + mascotHTML('penguin', 120, 'Пингвин Хагси') + '</div>' +
      '<h2>Закрытое тестирование</h2>' +
      '<p class="pin-desc">Привет! Hugsy пока тестируется в узком кругу. Введи код доступа, чтобы зайти 🐧</p>' +
      '<form id="pin-form" class="pin-form" onsubmit="return false;">' +
        '<div class="pin-input-wrap">' +
          '<input type="password" id="pin-input" class="pin-input" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="••••" autocomplete="off" autofocus />' +
        '</div>' +
        '<div id="pin-error" class="pin-error" aria-live="polite"></div>' +
        '<button type="submit" class="btn pin-submit" id="pin-submit">Войти</button>' +
      '</form>' +
      '<p class="pin-hint muted">Код доступа: 4 цифры</p>' +
    '</div>';

  document.body.appendChild(gate);

  var form = document.getElementById('pin-form');
  var input = document.getElementById('pin-input');
  var err = document.getElementById('pin-error');
  var card = gate.querySelector('.pin-card');

  if (input) setTimeout(function () { input.focus(); }, 120);

  function checkAndSubmit() {
    var val = (input.value || '').trim();
    if (val === ACCESS_PIN) {
      err.textContent = '';
      var submitBtn = document.getElementById('pin-submit');
      if (submitBtn) submitBtn.textContent = 'Открываем... 🐧';
      Store.set('pin_auth', true);
      setTimeout(function () {
        document.documentElement.classList.remove('pin-locked');
        gate.style.transition = 'opacity .25s ease-out';
        gate.style.opacity = '0';
        setTimeout(function () { gate.remove(); }, 250);
      }, 350);
    } else {
      err.textContent = 'Код не подошёл, попробуй ещё ❄️';
      card.classList.remove('pin-shake');
      void card.offsetWidth;
      card.classList.add('pin-shake');
      input.value = '';
      input.focus();
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    checkAndSubmit();
  });

  input.addEventListener('input', function () {
    if (input.value.length === 4) {
      checkAndSubmit();
    }
  });
}

/* Функция для повторной блокировки (для тестирования) */
window.lockSite = function () {
  Store.del('pin_auth');
  location.reload();
};

/* ---------------- Обои (узор или своя картинка) ----------------
   Настройки лежат в Store['wall']:
   { type: 'none'|'pattern'|'image', pattern, scale, alpha, color, veil, img } */

var WALL_DEFAULT = {
  type: 'none', pattern: 'flowers', scale: 1, alpha: 0.5, color: '', veil: 0,
  img: '', imgFit: 'cover', imgZoom: 1
};

function wallGet() {
  var w = Store.get('wall', null) || {};
  var out = {};
  for (var k in WALL_DEFAULT) out[k] = (w[k] === undefined ? WALL_DEFAULT[k] : w[k]);
  return out;
}
function wallSet(w) { Store.set('wall', w); applyWallpaper(); }

function findPattern(id) {
  if (typeof PATTERNS === 'undefined') return null;
  for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i].id === id) return PATTERNS[i];
  return null;
}

/* Цвет узора: либо свой, либо акцент текущей темы */
function wallColor(w) {
  if (w && w.color) return w.color;
  var v = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  return (v || '#ff9a76').trim();
}

/* Плитка узора как data-URI. Две фигурки по диагонали — стыкуется без швов. */
function patternURI(p, color, alpha) {
  var t = PATTERN_TILE;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + t + '" height="' + t + '" viewBox="0 0 ' + t + ' ' + t + '">' +
    '<g opacity="' + alpha + '">' +
    '<g transform="translate(4,4)">' + p.draw(color) + '</g>' +
    '<g transform="translate(34,34)">' + p.draw(color) + '</g>' +
    '</g></svg>';
  // Кавычки одинарные: эта строка подставляется и в style="..." в HTML.
  return "url('data:image/svg+xml;utf8," + encodeURIComponent(svg).replace(/'/g, '%27') + "')";
}

function applyWallpaper() {
  var w = wallGet();
  var el = document.getElementById('wall');

  if (w.type === 'none' || (w.type === 'image' && !w.img)) {
    if (el) el.parentNode.removeChild(el);
    document.documentElement.removeAttribute('data-wall');
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'wall';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<i class="veil"></i>';
    document.body.appendChild(el);
  }
  document.documentElement.setAttribute('data-wall', '1');

  if (w.type === 'image') {
    el.style.backgroundImage = 'url("' + w.img + '")';
    el.style.backgroundSize = w.imgFit === 'contain' ? 'contain' : 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundRepeat = 'no-repeat';
    // Масштаб делаем трансформом всего слоя: так работает и для «заполнить», и для «целиком»
    el.style.transform = w.imgZoom && w.imgZoom !== 1 ? 'scale(' + w.imgZoom + ')' : '';
  } else {
    el.style.transform = '';
    var p = findPattern(w.pattern) || (typeof PATTERNS !== 'undefined' ? PATTERNS[0] : null);
    if (!p) { el.parentNode.removeChild(el); return; }
    el.style.backgroundImage = patternURI(p, wallColor(w), w.alpha);
    el.style.backgroundSize = Math.round(PATTERN_TILE * w.scale) + 'px';
    el.style.backgroundRepeat = 'repeat';
    el.style.backgroundPosition = 'top left';
  }
  el.firstChild.style.opacity = w.veil;
}

/* ---------------- Маскот ----------------
   Персонажи — готовые картинки в assets/img (пингвин, енот, гусь, все вместе).
   Векторного пингвина больше нет: рядом с рендерами он выглядел самодельно.
   ASSET_BASE задаётся на страницах в подпапках (см. panic/*.html). */
function mascotHTML(name, width, alt) {
  return '<img class="mascot" src="' + (window.ASSET_BASE || '') + 'assets/img/' + name +
         '.webp" alt="' + (alt || '') + '" style="width:' + (width || 150) + 'px">';
}

/* ---------------- Иконки ---------------- */
/* icon('compass') -> готовый <svg>. Неизвестное имя даёт пустую строку,
   чтобы старые данные с эмодзи не ломали вёрстку (см. iconOr). */
function icon(name, cls) {
  if (typeof ICONS === 'undefined' || !ICONS[name]) return '';
  return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
         'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
         ICONS[name] + '</svg>';
}
/* Для данных, где может лежать и имя иконки, и старый эмодзи */
function iconOr(name) { return icon(name) || esc(name || ''); }

function mountIcons(root) {
  var slots = (root || document).querySelectorAll('[data-icon]');
  for (var i = 0; i < slots.length; i++) {
    if (slots[i].firstChild) continue;
    slots[i].innerHTML = icon(slots[i].dataset.icon);
  }
}

/* ---------------- Недельная лента дней ----------------
   Семь кружков: заполненные — там, где что-то было, сегодня — с ободком.
   Пустые дни остаются нейтральными: никакого красного и никаких упрёков. */
var WDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function weekKeys() {
  var now = new Date();
  var shift = (now.getDay() + 6) % 7; // понедельник — первый день
  var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - shift);
  var out = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    out.push({
      key: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()),
      label: WDAYS[i],
      num: d.getDate(),
      future: d > now && d.toDateString() !== now.toDateString()
    });
  }
  return out;
}

/* filled — объект или массив ключей вида '2026-11-03' */
function weekStripHTML(filled, caption) {
  var set = {};
  if (filled) {
    if (filled.length !== undefined) { for (var i = 0; i < filled.length; i++) set[filled[i]] = true; }
    else set = filled;
  }
  var days = weekKeys(), today = todayKey(), n = 0;
  var html = '<div class="week" role="list">';
  for (var j = 0; j < days.length; j++) {
    var d = days[j];
    var on = !!set[d.key];
    if (on) n++;
    html += '<div class="wday' + (d.key === today ? ' today' : '') + '" role="listitem">' +
      '<span class="wlabel">' + d.label + '</span>' +
      '<span class="wdot' + (on ? ' on' : '') + (d.key === today ? ' ring' : '') +
      (d.future ? ' future' : '') + '" title="' + d.key + '">' +
      (on ? icon('check') : d.num) + '</span></div>';
  }
  html += '</div>';
  if (caption !== false) {
    html += '<p class="muted" style="margin:10px 0 0">' +
      (n ? 'На этой неделе отмечено дней: ' + n + '. Этого достаточно.'
         : 'На этой неделе пока пусто. Начать можно прямо сегодня.') + '</p>';
  }
  return html;
}

/* Общий журнал «что-то сделано» по дням — для ленты на странице рутины */
function markDay(key) {
  var days = Store.get('days.done', {});
  if (!days[key || todayKey()]) {
    days[key || todayKey()] = true;
    Store.set('days.done', days);
  }
}

/* ---------------- Утилиты ---------------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

var toastTimer = null;
function toast(msg) {
  var old = document.querySelector('.toast');
  if (old) old.remove();
  var el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.remove(); }, 2600);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function nowLocal() {
  var d = new Date();
  return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1) + '.' + d.getFullYear() +
         ', ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

function todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

/* Скачивание файла без сервера */
function downloadFile(name, text, mime) {
  var blob = new Blob(['﻿' + text], { type: (mime || 'text/plain') + ';charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/* Похвала за действие — всегда мягкая, никогда не укоряющая */
/* Формулировки без рода — работают для всех и не требуют профиля */
var PRAISE = [
  'Записано — это уже забота о себе 🐧',
  'Пингвин гордится тобой',
  'Маленький шаг тоже считается',
  'Готово. Ты молодец',
  'Отмечено. Спасибо, что заглядываешь'
];
function praise() {
  toast(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
}

/* ---------------- Старт ---------------- */
document.addEventListener('DOMContentLoaded', function () {
  initPinGate();
  initThemes();
  initNavMore();
  applyWallpaper();
  mountIcons();
  // Service Worker нужен только на боевом сайте. На localhost он отдавал бы
  // старые CSS и JS из кеша и мешал разработке, поэтому там его сносим.
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    if (local) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        for (var i = 0; i < rs.length; i++) rs[i].unregister();
      }).catch(function () {});
      if (window.caches) {
        caches.keys().then(function (ks) {
          for (var j = 0; j < ks.length; j++) caches.delete(ks[j]);
        }).catch(function () {});
      }
    } else {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }
});
