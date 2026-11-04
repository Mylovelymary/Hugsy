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
      '<p class="pin-desc">Привет! Хагси пока тестируется в узком кругу. Введи код доступа, чтобы зайти 🐧</p>' +
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

/* Текущее время в формате HH:MM — им заполняются поля времени по умолчанию */
function nowHM() {
  var d = new Date();
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

/* Склонение по числу: plural(2, 'минута', 'минуты', 'минут') -> 'минуты'.
   Нужно везде, где число показывается рядом со словом: «2 минут» режет глаз. */
function plural(n, one, few, many) {
  var m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

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

/* ---------------- Выбор времени ----------------
   Свой контрол вместо <input type="time">: системный зависит от языка браузера
   и у половины людей показывает AM/PM и крошечные стрелочки. Здесь всегда 24 часа,
   кнопки под палец и никаких выпадающих списков.
   Значение лежит в скрытом поле с тем же id, поэтому читается привычным .value. */
function timeFieldHTML(id, value, allowEmpty) {
  var v = /^\d{1,2}:\d{2}$/.test(value || '') ? value : '';
  return '<div class="timefield" id="' + id + '-tf" data-empty="' + (v ? 'false' : 'true') + '">' +
    '<input type="hidden" id="' + id + '" value="' + v + '">' +
    '<div class="tf-box">' +
      tfUnitHTML(id, 'h', v) + '<span class="tf-sep">:</span>' + tfUnitHTML(id, 'm', v) +
    '</div>' +
    (allowEmpty ? '<button type="button" class="btn sm ghost" data-tclear="' + id + '">Без времени</button>' : '') +
    '</div>';
}

function tfUnitHTML(id, unit, v) {
  var parts = v ? v.split(':') : ['', ''];
  var shown = v ? pad2(parseInt(parts[unit === 'h' ? 0 : 1], 10)) : '--';
  var name = unit === 'h' ? 'Часы' : 'Минуты';
  return '<div class="tf-unit">' +
    '<button type="button" class="tf-btn" data-tadj="' + id + ':' + unit + ':1" aria-label="' + name + ': больше">' + icon('plus') + '</button>' +
    '<span class="tf-val" data-tfval="' + id + ':' + unit + '" role="status" aria-label="' + name + '">' + shown + '</span>' +
    '<button type="button" class="tf-btn" data-tadj="' + id + ':' + unit + ':-1" aria-label="' + name + ': меньше">' + icon('minus') + '</button>' +
    '</div>';
}

function timeFieldSet(id, value) {
  var input = document.getElementById(id);
  if (!input) return;
  input.value = value;
  var box = document.getElementById(id + '-tf');
  if (box) box.dataset.empty = value ? 'false' : 'true';
  var parts = value ? value.split(':') : ['', ''];
  var h = document.querySelector('[data-tfval="' + id + ':h"]');
  var m = document.querySelector('[data-tfval="' + id + ':m"]');
  if (h) h.textContent = value ? pad2(parseInt(parts[0], 10)) : '--';
  if (m) m.textContent = value ? pad2(parseInt(parts[1], 10)) : '--';
}

/* Часы шагают по одному, минуты по пять и переносят час: так быстрее попасть
   в нужное время, чем печатать его на телефоне. */
function timeFieldAdjust(id, unit, dir) {
  var input = document.getElementById(id);
  if (!input) return;
  var cur = input.value;
  if (!cur) {
    var now = new Date();
    cur = pad2((now.getHours() + 1) % 24) + ':00';   // ближайший круглый час
    timeFieldSet(id, cur);
    return;
  }
  var p = cur.split(':');
  var mins = parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  mins += dir * (unit === 'h' ? 60 : 5);
  mins = ((mins % 1440) + 1440) % 1440;
  timeFieldSet(id, pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60));
}

function initTimeFields() {
  document.addEventListener('click', function (e) {
    var adj = e.target.closest('[data-tadj]');
    if (adj) {
      var a = adj.dataset.tadj.split(':');
      timeFieldAdjust(a[0], a[1], parseInt(a[2], 10));
      return;
    }
    var clr = e.target.closest('[data-tclear]');
    if (clr) timeFieldSet(clr.dataset.tclear, '');
  });
}

/* ---------------- Кнопка «домой» на телефоне ----------------
   На узком экране «Хагси» в шапке читается как логотип, а не как кнопка.
   Поэтому на всех страницах, кроме главной, рядом появляется явная стрелка назад. */
function initBackHome() {
  var top = document.querySelector('.top');
  if (!top) return;
  var base = window.ASSET_BASE || '';
  var page = location.pathname.split('/').pop() || 'index.html';
  if (!base && (page === 'index.html' || page === '')) return;   // мы и так дома

  var a = document.createElement('a');
  a.className = 'back-home';
  a.href = base + 'index.html';
  a.setAttribute('aria-label', 'На главную');
  a.innerHTML = icon('left') + '<i>Главная</i>';
  top.appendChild(a);   // справа от названия: см. .back-home в style.css
}

/* ---------------- Голосовой ввод ----------------
   Web Speech API: встроен в браузер, бесплатный, ключей не требует.
   Распознавание идёт на стороне браузера и нужен интернет — это единственное место,
   где данные покидают устройство, поэтому кнопка всегда добровольная и подписана.
   Общий слой: им пользуются и таблицы, и ящик мыслей. */
function hasSpeech() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* Круглая кнопка с одним микрофоном: слово «Надиктовать» занимало место
   в каждой ячейке таблицы, а смысл иконки и так понятен. Подпись осталась
   в title и aria-label — для скринридера и для тех, кто наводит мышь. */
function micBtnHTML(attr, style) {
  if (!hasSpeech()) return '';
  return '<button type="button" class="mic-btn" ' + attr +
         (style ? ' style="' + style + '"' : '') +
         ' title="Надиктовать (нужен интернет)" aria-label="Надиктовать">' +
         icon('mic') + '</button>';
}

var speechRec = null;
function startMicInto(field, btn) {
  var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor || !field) return;
  if (speechRec) { speechRec.stop(); speechRec = null; }
  speechRec = new Ctor();
  speechRec.lang = 'ru-RU';
  speechRec.interimResults = true;
  speechRec.continuous = false;
  var base = field.value;
  btn.innerHTML = icon('mic');
  btn.classList.add('listening');
  btn.setAttribute('aria-label', 'Слушаю, нажми чтобы остановить');
  speechRec.onresult = function (e) {
    var txt = '';
    for (var i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
    field.value = (base ? base + ' ' : '') + txt;
  };
  speechRec.onerror = function (e) {
    toast(e.error === 'not-allowed' ? 'Браузер не дал доступ к микрофону' : 'Не получилось распознать');
  };
  speechRec.onend = function () {
    btn.innerHTML = icon('mic');
    btn.classList.remove('listening');
    btn.setAttribute('aria-label', 'Надиктовать');
    speechRec = null;
  };
  try { speechRec.start(); } catch (e) { btn.classList.remove('listening'); }
}

/* ---------------- Ящик мыслей ----------------
   При СДВГ мысль, которая пришла не вовремя, либо утащит из дела, либо потеряется.
   Ящик есть на каждой странице: бросил — и вернулся к тому, что делал.
   Разбирается он на «Рутине»: мысль превращается в задачу или просто уходит.
   На экране упражнения «Аптечки» кнопки нет (там человеку не до мыслей) —
   такие страницы ставят у <body> атрибут data-no-inbox. */
function inboxGet() { return Store.get('inbox', []); }
function inboxSave(list) { Store.set('inbox', list); }

function inboxAdd(text) {
  var list = inboxGet();
  list.unshift({ id: uid(), text: text, ts: nowLocal() });
  inboxSave(list);
  return list;
}

function inboxDel(id) {
  inboxSave(inboxGet().filter(function (x) { return x.id !== id; }));
}

function inboxCount() {
  var btn = document.getElementById('inboxBtn');
  if (!btn) return;
  var n = inboxGet().length;
  var badge = btn.querySelector('.inbox-n');
  badge.textContent = n ? n : '';
  badge.hidden = !n;
  btn.setAttribute('aria-label', n ? 'Ящик мыслей, записок внутри: ' + n : 'Ящик мыслей, пока пусто');
}

function inboxRender() {
  // Список записок живёт на странице «Дела», в окошке — только ввод:
  // всплывающая панель со списком закрывала пол-экрана и путала.
  var go = document.getElementById('inboxGo');
  if (go) {
    var n = inboxGet().length;
    go.hidden = !n;
    if (n) go.innerHTML = icon('right') + ' Перейти в ящик · ' + n;
  }
  inboxCount();
}

function inboxToggle(open) {
  var panel = document.getElementById('inboxPanel');
  var btn = document.getElementById('inboxBtn');
  if (!panel) return;
  var show = (open == null) ? panel.hidden : open;
  panel.hidden = !show;
  btn.setAttribute('aria-expanded', show ? 'true' : 'false');
  // Пока панель открыта, напоминание не висит у неё на пути
  var chip = document.getElementById('remChip');
  if (chip && show) chip.hidden = true;
  if (show) {
    inboxRender();
    document.getElementById('inboxText').focus();
  } else {
    btn.focus();
    renderRemChip();
  }
}

function inboxSubmit() {
  var field = document.getElementById('inboxText');
  var text = field.value.trim();
  if (!text) { toast('Напиши хоть пару слов — и закрывай'); return; }
  inboxAdd(text);
  field.value = '';
  inboxRender();
  if (typeof renderInboxCard === 'function') renderInboxCard();
  toast('В ящике. Голову можно освободить 🐧');
}

function initInbox() {
  if (document.body.hasAttribute('data-no-inbox')) return;

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'inboxBtn';
  btn.className = 'inbox-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'inboxPanel');
  btn.innerHTML = icon('MessageCircle') + '<i>Мысль</i><span class="inbox-n" hidden></span>';

  var panel = document.createElement('div');
  panel.id = 'inboxPanel';
  panel.className = 'inbox-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ящик мыслей');
  panel.innerHTML =
    '<button type="button" class="inbox-x" data-inbox="close" aria-label="Закрыть ящик">' +
      icon('close') + '</button>' +
    '<h3>Ящик мыслей</h3>' +
    '<p class="muted">Пришло не вовремя — положи сюда и возвращайся к делу. Разобрать можно в «Делах».</p>' +
    '<textarea id="inboxText" rows="3" placeholder="Что всплыло в голове"></textarea>' +
    '<div class="btn-row">' + micBtnHTML('data-inbox="mic"') +
    '<button type="button" class="btn sm" data-inbox="save">Убрать в ящик</button></div>' +
    '<a class="btn sm ghost inbox-go" id="inboxGo" hidden href="' +
    (window.ASSET_BASE || '') + 'routine.html#inboxCard">' + icon('right') + ' Перейти в ящик</a>';

  var chip = document.createElement('a');
  chip.id = 'remChip';
  chip.className = 'rem-chip';
  chip.hidden = true;
  chip.href = (window.ASSET_BASE || '') + 'routine.html#remCard';

  document.body.appendChild(chip);
  document.body.appendChild(btn);
  document.body.appendChild(panel);
  inboxCount();
  renderRemChip();

  btn.addEventListener('click', function () { inboxToggle(); });

  panel.addEventListener('click', function (e) {
    var del = e.target.closest('[data-inbox-del]');
    if (del) {
      inboxDel(del.dataset.inboxDel);
      inboxRender();
      if (typeof renderInboxCard === 'function') renderInboxCard();
      return;
    }
    var act = e.target.closest('[data-inbox]');
    if (!act) return;
    if (act.dataset.inbox === 'save') inboxSubmit();
    if (act.dataset.inbox === 'close') inboxToggle(false);
    if (act.dataset.inbox === 'mic') startMicInto(document.getElementById('inboxText'), act);
  });

  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { inboxSubmit(); return; }
    if (e.key === 'Escape') inboxToggle(false);
  });

  document.addEventListener('click', function (e) {
    if (panel.hidden) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    inboxToggle(false);
  });
}

/* ---------------- Мягкие напоминания ----------------
   Только те, что человек поставил себе сам. Ни одного «ты не заходил три дня».
   Пропущенное напоминание не догоняет: если время ушло больше чем на час,
   оно тихо гасится до завтра — висящий укор никому не помогает.
   Работает, пока вкладка открыта; без сервера иначе нельзя, и мы честно это пишем. */
var REM_WINDOW_MIN = 60;

function remGet() { return Store.get('reminders', []); }
function remSave(list) { Store.set('reminders', list); }

function minutesOf(hm) {
  var p = String(hm || '').split(':');
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}

function softNotify(msg) {
  toast(msg);
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Хагси', { body: msg, icon: (window.ASSET_BASE || '') + 'assets/img/icon-192.webp' });
    }
  } catch (e) {}
}

/* Ближайшее напоминание на сегодня висит над кнопкой «Мысль».
   Это не уведомление и не укор: просто видно, что ты сам себе поставил. */
function nextReminder() {
  var list = remGet();
  var d = new Date();
  var nowMin = d.getHours() * 60 + d.getMinutes();
  var today = todayKey();
  var best = null;
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r.on || r.fired === today) continue;
    var due = minutesOf(r.time);
    if (due < nowMin) continue;
    if (!best || due < minutesOf(best.time)) best = r;
  }
  return best;
}

/* Чип — такой же кружок, как «Мысль»: будильник и число напоминаний.
   Текста нет намеренно: это не уведомление, а напоминание о том, что они есть.
   По клику открывается блок напоминаний в «Делах». */
function activeReminders() {
  var list = remGet();
  var today = todayKey();
  var n = 0;
  for (var i = 0; i < list.length; i++) {
    if (list[i].on && list[i].fired !== today) n++;
  }
  return n;
}

function renderRemChip() {
  var chip = document.getElementById('remChip');
  if (!chip) return;
  var panel = document.getElementById('inboxPanel');
  var n = activeReminders();
  if (!n || (panel && !panel.hidden)) { chip.hidden = true; return; }
  chip.innerHTML = icon('AlarmClock') + '<i>Напоминания</i><span class="rem-n">' + n + '</span>';
  chip.setAttribute('aria-label', 'Напоминаний на сегодня: ' + n + '. Открыть их');
  chip.title = 'Напоминания: ' + n;
  chip.hidden = false;
}

function remTick() {
  var list = remGet();
  if (!list.length) { renderRemChip(); return; }
  var d = new Date();
  var nowMin = d.getHours() * 60 + d.getMinutes();
  var today = todayKey();
  var changed = false;

  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r.on || r.fired === today) continue;
    var due = minutesOf(r.time);
    if (nowMin < due) continue;
    r.fired = today;
    changed = true;
    // Опоздали больше чем на час — гасим молча, без догоняющего упрёка
    if (nowMin - due <= REM_WINDOW_MIN) softNotify(r.text || 'Твоё напоминание');
  }
  if (changed) remSave(list);
  renderRemChip();
}

function initReminders() {
  remTick();
  setInterval(remTick, 20000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) remTick();
  });
}

/* ---------------- Старт ---------------- */
document.addEventListener('DOMContentLoaded', function () {
  initPinGate();
  initThemes();
  initNavMore();
  applyWallpaper();
  mountIcons();
  initBackHome();
  initInbox();
  initReminders();
  initTimeFields();
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
      // updateViaCache: 'none' — браузеру запрещено брать сам sw.js из своего HTTP-кеша,
      // иначе он может сутки не замечать, что вышла новая версия сайта
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () {});
    }
  }
});
