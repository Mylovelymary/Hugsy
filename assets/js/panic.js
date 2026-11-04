/* Раздел «Аптечка»: помощь при панике и тревоге.
   Перенесено из отдельного Next.js-проекта. Тексты упражнений не менять —
   они собраны из опыта реальных людей (см. шапку data/panic-data.js). */

var ORIGIN = 'https://mylovelymary.github.io'; // пока не перенесённые упражнения открываем там

/* ---------- Избранное: «моя аптечка» ---------- */
function favs() { return Store.get('panic.favs', []); }
function isFav(id) { return favs().indexOf(id) >= 0; }
function toggleFav(id) {
  var f = favs(), i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  Store.set('panic.favs', f);
  return i < 0;
}

function qs(name) {
  var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
  return m ? decodeURIComponent(m[1]) : '';
}
function byRank(a, b) { return (a.rank || 99) - (b.rank || 99); }

/* ---------- Главная аптечки ---------- */
function renderPanicHome(root) {
  var html = '<div class="hero" style="padding-bottom:0">' +
    '<img class="mascot hero-mascot" src="../assets/img/raccoon.webp" width="380" height="459" ' +
    'alt="Енот Хагси" style="width:clamp(140px,38vw,180px)">' +
    '<h1>Аптечка</h1>' +
    '<p class="lead">Помощь при панике и тревоге. Ничего не нужно читать целиком — ' +
    'выбери, как тебе сейчас, и делай по шагам.</p></div>';

  html += '<a class="sos" href="list.html?state=panic"><b>Тебе плохо прямо сейчас?</b>' +
          '<span>Жми сюда — поможем в несколько шагов</span></a>';

  html += '<h2><span class="eyebrow">С чего начать</span>Как тебе сейчас?</h2><div class="grid">';
  for (var i = 0; i < STATES.length; i++) {
    html += '<a class="tile" href="list.html?state=' + STATES[i].id + '">' +
      '<span class="ico">' + iconOr(STATES[i].icon) + '</span>' +
      '<strong>' + esc(STATES[i].label) + '</strong></a>';
  }
  html += '</div>';

  var fav = favs();
  if (fav.length) {
    html += '<h2><span class="eyebrow">' + icon('star') + ' Сохранённое</span>Моя аптечка</h2>' +
            '<div class="ex-list">';
    var shown = EXERCISES.filter(function (x) { return fav.indexOf(x.id) >= 0; }).sort(byRank);
    for (var fi = 0; fi < shown.length; fi++) {
      html += '<a class="ex-row" href="ex.html?id=' + shown[fi].id + '">' +
        '<span class="ic">' + iconOr(shown[fi].icon) + '</span>' +
        '<span class="tx"><b>' + esc(shown[fi].title) + '</b><span>' + esc(shown[fi].hint || '') + '</span></span>' +
        '<span style="color:var(--accent)">' + icon('star') + '</span></a>';
    }
    html += '</div><p class="muted" style="margin-top:10px">Это то, что ты отметил работающим. ' +
            'Звёздочку можно снять на странице способа.</p>';
  }

  html += '<h2><span class="eyebrow">Все способы</span>По разделам</h2><div class="grid">';
  for (var c = 0; c < CATEGORIES.length; c++) {
    var cat = CATEGORIES[c];
    var n = EXERCISES.filter(function (e) { return e.category === cat.id; }).length;
    html += '<a class="tile" href="list.html?cat=' + cat.id + '">' +
      '<span class="ico">' + iconOr(cat.icon) + '</span>' +
      '<strong>' + esc(cat.short) + '</strong>' +
      '<span class="d">' + esc(cat.hint) + '</span>' +
      '<span class="pill" style="margin-top:8px">' + n + ' ' +
      plural3(n, 'способ', 'способа', 'способов') + '</span></a>';
  }
  html += '</div>';

  if (!fav.length) {
    html += '<div class="note" style="margin-top:22px"><p>Жми звёздочку на том, что помогает, — ' +
            'соберётся <strong>твоя личная аптечка</strong>, и в следующий раз не придётся искать.</p></div>';
  }

  root.innerHTML = html;
}

function plural3(n, a, b, c) {
  var m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b;
  return c;
}

/* ---------- Список упражнений ---------- */
function renderPanicList(root) {
  var state = qs('state'), cat = qs('cat'), fav = qs('fav');
  var list = EXERCISES.slice(), title = 'Все способы', hint = '';

  if (fav) {
    var f = favs();
    list = list.filter(function (e) { return f.indexOf(e.id) >= 0; });
    title = 'Моя аптечка';
    hint = 'То, что ты отметил звёздочкой как работающее.';
  } else if (state) {
    var st = STATES.filter(function (s) { return s.id === state; })[0];
    list = list.filter(function (e) { return (e.states || []).indexOf(state) >= 0; });
    title = st ? st.label : title;
    hint = 'Сверху то, что чаще всего называют работающим обычные люди.';
  } else if (cat) {
    var ct = CATEGORIES.filter(function (c) { return c.id === cat; })[0];
    list = list.filter(function (e) { return e.category === cat; });
    if (ct) { title = ct.label; hint = ct.hint; }
  }
  list.sort(byRank);

  var html = '<h1>' + esc(title) + '</h1>' + (hint ? '<p class="muted">' + esc(hint) + '</p>' : '');
  if (!list.length) {
    html += '<div class="card empty"><p>Тут пока пусто. Открой любой способ и нажми звёздочку — ' +
            'он попадёт сюда.</p><a class="btn" href="index.html">Посмотреть способы</a></div>';
  } else {
    html += '<div class="ex-list">';
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      html += '<a class="ex-row" href="ex.html?id=' + e.id + '">' +
        '<span class="ic">' + iconOr(e.icon) + '</span>' +
        '<span class="tx"><b>' + esc(e.title) + '</b><span>' + esc(e.hint || '') + '</span></span>' +
        (isFav(e.id) ? '<span style="color:var(--accent)">' + icon('star') + '</span>' : '') +
        '</a>';
    }
    html += '</div>';
  }
  html += '<div class="btn-row" style="margin-top:20px"><a class="btn ghost" href="index.html">' +
          icon('left') + ' Ко всем состояниям</a></div>';
  root.innerHTML = html;
}

/* ---------- Одно упражнение ---------- */
function renderPanicEx(root) {
  var e = exById(qs('id'));
  if (!e) { root.innerHTML = '<div class="card"><p>Такого способа нет. <a href="index.html">Вернуться</a></p></div>'; return; }
  document.title = e.title + ' — Аптечка';

  var html = '<div style="display:flex;align-items:center;gap:13px;margin-bottom:6px">' +
    '<span class="ex-row ic" style="width:48px;height:48px;border-radius:15px;display:flex;' +
    'align-items:center;justify-content:center;background:var(--accent-soft);color:var(--accent-ink)">' +
    iconOr(e.icon) + '</span>' +
    '<h1 style="flex:1;margin:0">' + esc(e.title) + '</h1>' +
    '<button class="star-btn" data-fav="' + e.id + '" aria-pressed="' + isFav(e.id) + '" ' +
    'aria-label="В мою аптечку">' + icon('star') + '</button></div>';

  html += '<p class="lead" style="margin-bottom:20px">' + esc(e.intro || '') + '</p>';
  html += '<div id="exBody"></div>';
  html += '<div class="btn-row" style="margin-top:24px">' +
    '<a class="btn ghost" href="list.html?cat=' + e.category + '">' + icon('left') + ' Другие способы</a>' +
    '<a class="btn ghost" href="index.html">В начало</a></div>';
  root.innerHTML = html;
  renderExBody(e, document.getElementById('exBody'));
}

function renderExBody(e, host) {
  switch (e.type) {
    case 'steps': return exSteps(e, host);
    case 'phrases': return exPhrases(e, host);
    case 'smallsteps': return exSmallSteps(e, host);
    case 'postpone': return exPostpone(e, host);
    case 'door': return exDoor(e, host);
    case 'burn': return exCounter(e, host, { mode: 'time', seconds: 30,
      lead: 'Тридцать секунд на максимум: приседания, прыжки, бег на месте.',
      done: 'Адреналин сожжён. Отдышись — и заметь, что стало легче.' });
    case 'armdrop': return exCounter(e, host, { mode: 'reps', reps: 30,
      lead: 'Руки вверх — резкий выдох «ХА!» — локти вниз. Отмечай каждый раз.',
      done: 'Тридцать сбросов. Тело своё дело сделало.' });
    case 'tapping': return exTapping(e, host);
    case 'senses': return exSenses(e, host);
    case 'emdr': return exEmdr(e, host);
    case 'muscle': return exMuscle(e, host);
    case 'breath': return exBreath(e, host, 'box');
    case 'belly': return exBreath(e, host, 'soft');
    case 'bubbles': return exBubbles(e, host);
    case 'rule5': return exRule5(e, host);
    default: return exNotYet(e, host);
  }
}

/* Пошаговое упражнение */
function exSteps(e, host) {
  var html = '<ol class="ex-steps">';
  for (var i = 0; i < (e.steps || []).length; i++) {
    html += '<li><span class="em">' + esc(e.steps[i].icon || '') + '</span>' +
            '<span>' + esc(e.steps[i].text) + '</span></li>';
  }
  host.innerHTML = html + '</ol>';
}

/* Колода фраз */
var deckIdx = 0;
function exPhrases(e, host) {
  deckIdx = 0;
  var own = Store.get('panic.myphrases', []);
  function draw() {
    var cards = (e.cards || []).concat(e.id === 'phrases' ? own : []);
    if (!cards.length) cards = ['Пока пусто — добавь свою фразу.'];
    var i = ((deckIdx % cards.length) + cards.length) % cards.length;
    var html = '<div class="deck-card">' + esc(cards[i]) + '</div>' +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn ghost" data-deck="-1">' + icon('left') + ' Назад</button>' +
      '<button class="btn" data-deck="1">Дальше ' + icon('right') + '</button></div>' +
      '<p class="muted center" style="margin-top:12px">' + (i + 1) + ' из ' + cards.length + '</p>';
    if (e.id === 'phrases') {
      html += '<div class="card soft" style="margin-top:18px"><h3>Своя фраза</h3>' +
        '<p class="muted">Свои слова работают лучше чужих. Они сохранятся только у тебя.</p>' +
        '<label class="f"><span>Что ты говоришь себе, когда помогает</span>' +
        '<input type="text" id="myPhrase" placeholder="Например: я это уже проходил"></label>' +
        '<button class="btn sm" data-addphrase="1">' + icon('plus') + ' Добавить в колоду</button></div>';
    }
    host.innerHTML = html;
  }
  draw();
  host.addEventListener('click', function (ev) {
    var d = ev.target.closest('[data-deck]');
    if (d) { deckIdx += parseInt(d.dataset.deck, 10); draw(); return; }
    if (ev.target.closest('[data-addphrase]')) {
      var inp = document.getElementById('myPhrase');
      var v = inp && inp.value.trim();
      if (!v) { toast('Напиши фразу'); return; }
      own.push(v);
      Store.set('panic.myphrases', own);
      deckIdx = (e.cards || []).length + own.length - 1;
      draw();
      toast('Добавлено в колоду');
    }
  });
}

/* Рулетка крошечных шагов */
function exSmallSteps(e, host) {
  var order = SMALL_STEPS.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
  var idx = 0, done = 0;
  function draw() {
    var s = SMALL_STEPS[order[idx % order.length]];
    host.innerHTML = '<div class="deck-card" style="flex-direction:column;gap:14px">' +
      '<span style="color:var(--accent)">' + iconOr(s.icon) + '</span>' +
      '<span>' + esc(s.text) + '</span></div>' +
      '<div class="btn-row" style="flex-direction:column">' +
      '<button class="btn" data-ss="done" style="width:100%">' + icon('check') + ' Сделано, дай следующий</button>' +
      '<button class="btn ghost" data-ss="skip" style="width:100%">Не могу такое, дай другое</button></div>' +
      (done ? '<p class="center" style="margin-top:18px;color:var(--ok);font-weight:600">' +
        (done === 1 ? 'Один шаг сделан. Это уже движение' : 'Сделано шагов: ' + done + '. Тихонько, но ты идёшь') +
        '</p>' : '') +
      '<p class="muted center" style="margin-top:18px">Никаких «соберись». Один крошечный шаг за раз — этого достаточно.</p>';
    var big = host.querySelector('.deck-card .i');
    if (big) { big.style.width = '44px'; big.style.height = '44px'; }
  }
  draw();
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-ss]');
    if (!b) return;
    if (b.dataset.ss === 'done') { done++; praise(); }
    idx++;
    draw();
  });
}

/* Договор о переносе паники */
function exPostpone(e, host) {
  var OPTIONS = [
    { label: 'Через час', phrase: 'через час' },
    { label: 'Вечером дома', phrase: 'вечером, дома, в спокойной обстановке' },
    { label: 'В выходные', phrase: 'в выходные, когда будет время' },
    { label: 'Никогда', phrase: 'никогда. Слот занят. Навсегда' }
  ];
  function draw(choice) {
    if (!choice) {
      var h = '<p style="font-size:1.12rem;line-height:1.5">Скажи панике как назойливому коллеге:<br>' +
        '<b>«Сейчас вообще некогда. Давай перенесём».</b></p>' +
        '<p class="muted">На когда переносим?</p><div class="btn-row" style="flex-direction:column">';
      for (var i = 0; i < OPTIONS.length; i++) {
        h += '<button class="btn ghost" data-pp="' + i + '" style="width:100%">' + esc(OPTIONS[i].label) + '</button>';
      }
      host.innerHTML = h + '</div>';
    } else {
      host.innerHTML = '<div class="deck-card">Договор подписан.<br>Паника перенесена на ' +
        esc(choice.phrase) + '.</div>' +
        '<p class="muted">Всё, вопрос закрыт — можно возвращаться к делам. Маленький секрет: ' +
        'на перенесённую встречу паника почти никогда не приходит. А если придёт — ты будешь ' +
        'в удобном месте и во всеоружии.</p>' +
        '<button class="btn ghost" data-pp="reset">Перенести на другое время</button>';
    }
  }
  draw(null);
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-pp]');
    if (!b) return;
    draw(b.dataset.pp === 'reset' ? null : OPTIONS[+b.dataset.pp]);
  });
}

/* Закрыть дверь перед паникой */
function exDoor(e, host) {
  function draw(closed) {
    host.innerHTML = closed
      ? '<div class="deck-card" style="flex-direction:column;gap:14px">' +
        '<span style="color:var(--accent)">' + iconOr('DoorClosed') + '</span>' +
        '<span>Дверь закрыта. «Приходи через месяц — может, подумаю».</span></div>' +
        '<p class="muted">Паника — незваная гостья. Ты не обязан впускать её только потому, ' +
        'что она постучала. Захлопнул — и пошёл заниматься своими делами.</p>' +
        '<button class="btn ghost" data-door="open">Открыть и захлопнуть ещё раз</button>'
      : '<p style="font-size:1.12rem;line-height:1.5">Паника стоит на пороге и хочет войти.<br>' +
        '<b>Захлопни дверь.</b></p>' +
        '<button class="btn" data-door="close" style="width:100%">' + iconOr('DoorClosed') +
        ' Захлопнуть дверь</button>';
    var big = host.querySelector('.deck-card .i');
    if (big) { big.style.width = '44px'; big.style.height = '44px'; }
  }
  draw(false);
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-door]');
    if (b) draw(b.dataset.door === 'close');
  });
}

/* Счётчик: либо секунды, либо повторы */
function exCounter(e, host, cfg) {
  var left = cfg.mode === 'time' ? cfg.seconds : cfg.reps;
  var iv = null, running = false;
  function draw() {
    host.innerHTML = '<p class="muted">' + esc(cfg.lead) + '</p>' +
      '<div class="big-count">' + (left > 0 ? left : '✓') + '</div>' +
      '<p class="center muted">' + (cfg.mode === 'time' ? 'секунд осталось' : 'повторов осталось') + '</p>' +
      '<div class="btn-row" style="justify-content:center;margin-top:14px">' +
      (left > 0
        ? (cfg.mode === 'time'
            ? '<button class="btn" data-cnt="go">' + icon(running ? 'pause' : 'play') + (running ? ' Пауза' : ' Поехали') + '</button>'
            : '<button class="btn" data-cnt="tick">Раз!</button>')
        : '<button class="btn ghost" data-cnt="reset">' + icon('undo') + ' Ещё раз</button>') +
      '</div>' + (left > 0 ? '' : '<p class="center" style="margin-top:16px;font-weight:600;color:var(--ok)">' +
        esc(cfg.done) + '</p>');
  }
  draw();
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-cnt]');
    if (!b) return;
    if (b.dataset.cnt === 'tick') { left--; if (left <= 0) praise(); draw(); return; }
    if (b.dataset.cnt === 'reset') { left = cfg.mode === 'time' ? cfg.seconds : cfg.reps; running = false; draw(); return; }
    if (running) { clearInterval(iv); running = false; draw(); return; }
    running = true; draw();
    iv = setInterval(function () {
      left--;
      if (left <= 0) { clearInterval(iv); running = false; praise(); }
      draw();
    }, 1000);
  });
}

/* Метроном «бабочка»: хлопай той рукой, чей кружок загорелся */
function exTapping(e, host) {
  var bpm = 80, playing = false, side = 0, beats = 0, iv = null;
  host.innerHTML =
    '<div class="tap-row"><div class="tap-side" id="tapL">Л</div>' +
    '<span style="color:var(--accent)">' + iconOr('HeartHandshake') + '</span>' +
    '<div class="tap-side" id="tapR">П</div></div>' +
    '<p class="muted center" id="tapInfo">Руки крест-накрест, ладони на плечах. ' +
    'Хлопай той, чей кружок загорается.</p>' +
    '<div class="btn-row" style="justify-content:center"><button class="btn" id="tapGo">' +
    icon('play') + ' Начать ритм</button></div>' +
    '<label class="f" style="max-width:340px;margin:20px auto 0"><span>Темп: ' +
    '<output id="tapBpm">80</output> ударов в минуту</span>' +
    '<input type="range" id="tapRange" min="50" max="130" step="5" value="80"></label>' +
    '<p class="muted center">Можно выбивать любимый ритм — строчку песни, что угодно. ' +
    'Если есть место — одновременно ходи по комнате: движение выводит адреналин быстрее всего.</p>';
  var L = host.querySelector('#tapL'), R = host.querySelector('#tapR');
  var go = host.querySelector('#tapGo'), info = host.querySelector('#tapInfo');
  var big = host.querySelector('.tap-row .i');
  if (big) { big.style.width = '52px'; big.style.height = '52px'; }

  function beat() {
    side = 1 - side;
    beats++;
    L.classList.toggle('hit', side === 0);
    R.classList.toggle('hit', side === 1);
    info.textContent = 'Хлопай той, чей кружок загорается. Хлопков: ' + beats;
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch (err) {} }
  }
  function sync() {
    clearInterval(iv);
    if (playing) iv = setInterval(beat, 60000 / bpm);
  }
  go.addEventListener('click', function () {
    playing = !playing;
    go.innerHTML = playing ? icon('pause') + ' Пауза' : icon('play') + (beats ? ' Продолжить' : ' Начать ритм');
    if (!playing) { L.classList.remove('hit'); R.classList.remove('hit'); }
    sync();
  });
  host.querySelector('#tapRange').addEventListener('input', function () {
    bpm = +this.value;
    host.querySelector('#tapBpm').textContent = bpm;
    sync();
  });
}

/* Классика 5-4-3-2-1 */
function exSenses(e, host) {
  var CATS = [
    { n: 5, t: 'вещей, которые ВИДИШЬ', ic: 'Eye' },
    { n: 4, t: 'вещи, которые можешь ПОТРОГАТЬ', ic: 'Hand' },
    { n: 3, t: 'звука, которые СЛЫШИШЬ', ic: 'Waves' },
    { n: 2, t: 'запаха, которые ЧУВСТВУЕШЬ', ic: 'Wind' },
    { n: 1, t: 'вкус во рту', ic: 'Utensils' }
  ];
  var c = [0, 0, 0, 0, 0];
  function draw() {
    var all = c.every(function (v, i) { return v === CATS[i].n; });
    var h = '';
    for (var i = 0; i < CATS.length; i++) {
      h += '<button type="button" class="sense-row' + (c[i] === CATS[i].n ? ' done' : '') +
        '" data-sense="' + i + '"><span style="display:flex;gap:12px;align-items:center">' +
        '<span style="color:var(--accent-2)">' + iconOr(CATS[i].ic) + '</span>' +
        '<span>Найди и назови <b>' + CATS[i].n + '</b> ' + esc(CATS[i].t) + '</span></span>' +
        '<span class="cnt">' + c[i] + '/' + CATS[i].n + '</span></button>';
    }
    if (all) {
      h += '<p class="center" style="font-size:1.1rem;font-weight:600;color:var(--ok);margin-top:14px">' +
        'Все чувства на месте — и ты здесь, в настоящем</p>' +
        '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn" data-sense="reset">' + icon('undo') + ' Ещё круг</button></div>';
    }
    host.innerHTML = h;
  }
  draw();
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-sense]');
    if (!b) return;
    if (b.dataset.sense === 'reset') { c = [0, 0, 0, 0, 0]; draw(); return; }
    var i = +b.dataset.sense;
    if (c[i] < CATS[i].n) c[i]++;
    var was = c.every(function (v, j) { return v === CATS[j].n; });
    draw();
    if (was) praise();
  });
}

/* Шарик для глаз */
function exEmdr(e, host) {
  var playing = false, speed = 1800, raf = null, start = null;
  host.innerHTML =
    '<div class="emdr-track" id="emTrack"><div class="emdr-ball" id="emBall"></div></div>' +
    '<div class="btn-row" style="justify-content:center">' +
    '<button class="btn" id="emGo">' + icon('play') + ' Запустить шарик</button></div>' +
    '<label class="f" style="max-width:340px;margin:20px auto 0"><span>Скорость: ' +
    '<output id="emLbl">средне</output></span>' +
    '<input type="range" id="emRange" min="900" max="3000" step="100" value="2100"></label>' +
    '<p class="muted center">Голова неподвижна, работают только глаза. Лучше всего — с экрана ' +
    'компьютера или планшета. Нет экрана — просто быстро переводи взгляд из одного угла комнаты в другой.</p>';
  var track = host.querySelector('#emTrack'), ball = host.querySelector('#emBall');
  var go = host.querySelector('#emGo');

  function frame(ts) {
    if (start === null) start = ts;
    var el = ts - start, p = (el % speed) / speed;
    var dir = Math.floor(el / speed) % 2 === 0 ? 1 : -1;
    var max = track.offsetWidth - ball.offsetWidth;
    var ease = (Math.sin(p * Math.PI - Math.PI / 2) + 1) / 2;
    ball.style.transform = 'translateX(' + (dir === 1 ? ease * max : max - ease * max) + 'px)';
    raf = requestAnimationFrame(frame);
  }
  go.addEventListener('click', function () {
    playing = !playing;
    go.innerHTML = playing ? icon('pause') + ' Пауза' : icon('play') + ' Запустить шарик';
    if (playing) { start = null; raf = requestAnimationFrame(frame); }
    else cancelAnimationFrame(raf);
  });
  host.querySelector('#emRange').addEventListener('input', function () {
    speed = 3900 - +this.value;
    host.querySelector('#emLbl').textContent = speed <= 1300 ? 'быстро' : (speed <= 2000 ? 'средне' : 'медленно');
    start = null;
  });
}

/* Прогрессивная мышечная релаксация */
function exMuscle(e, host) {
  var GROUPS = [
    { n: 'Кулаки', t: 'Сожми кулаки изо всех сил', ic: 'Hand' },
    { n: 'Руки', t: 'Согни руки и напряги бицепсы', ic: 'Dumbbell' },
    { n: 'Плечи', t: 'Подними плечи к ушам как можно выше', ic: 'Activity' },
    { n: 'Лицо', t: 'Зажмурься и сожми челюсти', ic: 'ScanFace' },
    { n: 'Живот', t: 'Напряги живот, как перед ударом', ic: 'ShieldCheck' },
    { n: 'Ноги', t: 'Вытяни ноги и напряги бёдра', ic: 'Footprints' },
    { n: 'Стопы', t: 'Подожми пальцы ног, напряги стопы', ic: 'Footprints' }
  ];
  var TENSE = 5, RELAX = 8;
  var gi = -1, phase = 'tense', left = TENSE, iv = null;

  function stop() { clearInterval(iv); iv = null; }
  function draw() {
    if (gi < 0) {
      var h = '<p class="muted">7 групп мышц, строго по очереди — сверху вниз. Каждую сильно напрячь ' +
        'на 5 секунд, потом резко отпустить и прочувствовать разницу. Сядь или ляг поудобнее.</p>' +
        '<ol class="ex-steps">';
      for (var i = 0; i < GROUPS.length; i++) {
        h += '<li><span style="color:var(--accent-2)">' + iconOr(GROUPS[i].ic) + '</span><span><b>' +
          esc(GROUPS[i].n) + '</b> — ' + esc(GROUPS[i].t) + '</span></li>';
      }
      host.innerHTML = h + '</ol><div class="btn-row" style="justify-content:center;margin-top:16px">' +
        '<button class="btn" data-mu="go">' + icon('play') + ' Начать</button></div>';
      return;
    }
    if (gi >= GROUPS.length) {
      host.innerHTML = '<div class="deck-card">Все группы пройдены. Посиди полминуты и просто ' +
        'послушай, как тело стало тяжелее и спокойнее.</div>' +
        '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn ghost" data-mu="reset">' + icon('undo') + ' Ещё раз</button></div>';
      return;
    }
    var g = GROUPS[gi];
    host.innerHTML = '<p class="center muted">Группа ' + (gi + 1) + ' из ' + GROUPS.length + '</p>' +
      '<div class="deck-card" style="flex-direction:column;gap:10px">' +
      '<span style="color:var(--accent)">' + iconOr(g.ic) + '</span>' +
      '<b style="font-size:1.2rem">' + esc(g.n) + '</b>' +
      '<span>' + (phase === 'tense' ? esc(g.t) : 'Отпусти. Полностью расслабь и почувствуй разницу') + '</span></div>' +
      '<div class="big-count">' + left + '</div>' +
      '<p class="center muted">' + (phase === 'tense' ? 'напрягай' : 'расслабляйся') + '</p>' +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn ghost" data-mu="stop">Остановить</button></div>';
    var big = host.querySelector('.deck-card .i');
    if (big) { big.style.width = '40px'; big.style.height = '40px'; }
  }
  function tick() {
    left--;
    if (left <= 0) {
      if (phase === 'tense') { phase = 'relax'; left = RELAX; if (navigator.vibrate) { try { navigator.vibrate(80); } catch (err) {} } }
      else { phase = 'tense'; left = TENSE; gi++; if (gi >= GROUPS.length) { stop(); praise(); } }
    }
    draw();
  }
  draw();
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-mu]');
    if (!b) return;
    stop();
    if (b.dataset.mu === 'stop' || b.dataset.mu === 'reset') { gi = -1; phase = 'tense'; left = TENSE; draw(); return; }
    gi = 0; phase = 'tense'; left = TENSE;
    draw();
    iv = setInterval(tick, 1000);
  });
}

/* Дыхание: круг растёт на вдохе и сжимается на выдохе */
function exBreath(e, host, defScheme) {
  var SCHEMES = {
    soft: { label: 'Мягкое 4–6', phases: [['Вдох', 4], ['Выдох', 6]] },
    box: { label: 'Квадрат 4-4-4-4', phases: [['Вдох', 4], ['Держим', 4], ['Выдох', 4], ['Пауза', 4]] },
    relax: { label: '4–7–8', phases: [['Вдох', 4], ['Держим', 7], ['Выдох', 8]] }
  };
  var key = defScheme, running = false, pi = 0, left = 0, cycles = 0, iv = null;

  function draw() {
    var ph = SCHEMES[key].phases, cur = ph[pi];
    var label = cur[0];
    var grow = running && (label === 'Вдох' || (label === 'Держим' && pi > 0 && ph[pi - 1][0] === 'Вдох'));
    var h = '<div class="btn-row" style="justify-content:center;margin-bottom:10px">';
    for (var k in SCHEMES) {
      h += '<button class="chip" data-br="' + k + '" aria-pressed="' + (k === key) + '">' +
        esc(SCHEMES[k].label) + '</button>';
    }
    h += '</div><div class="breath-circle" style="transform:scale(' + (grow ? 1.22 : (running ? .8 : 1)) + ')">' +
      (running ? left : '—') + '</div>' +
      '<p class="center" style="font-size:1.25rem;font-weight:700;font-family:var(--font-head)">' +
      (running ? esc(label) : 'Готов?') + '</p>' +
      '<p class="center muted">' + (cycles ? 'Кругов пройдено: ' + cycles : 'Дыши вместе с кругом') + '</p>' +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn" data-br="' + (running ? 'stop' : 'start') + '">' +
      (running ? icon('pause') + ' Остановить' : icon('play') + ' Начать') + '</button></div>' +
      '<p class="muted center">Если от счёта становится только хуже — это нормально, дыхание ' +
      'подходит не всем. Вернись к списку и возьми что-нибудь телесное.</p>';
    host.innerHTML = h;
  }
  function tick() {
    var ph = SCHEMES[key].phases;
    if (left > 1) { left--; }
    else {
      pi = (pi + 1) % ph.length;
      if (pi === 0) cycles++;
      left = ph[pi][1];
    }
    draw();
  }
  draw();
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-br]');
    if (!b) return;
    var v = b.dataset.br;
    clearInterval(iv); iv = null;
    if (v === 'stop') { running = false; draw(); return; }
    if (v !== 'start') { key = v; pi = 0; left = 0; cycles = 0; running = false; draw(); return; }
    running = true; pi = 0; cycles = 0; left = SCHEMES[key].phases[0][1];
    draw();
    iv = setInterval(tick, 1000);
  });
}

/* Лопай шарики нужного цвета */
function exBubbles(e, host) {
  var COLORS = [
    { id: 'rose', name: 'розовые', css: '#f0699c' },
    { id: 'sky', name: 'голубые', css: '#6fc3e0' },
    { id: 'mint', name: 'зелёные', css: '#5fc3a3' },
    { id: 'sun', name: 'жёлтые', css: '#f2c14e' }
  ];
  var target = 0, score = 0, miss = 0, timer = null, items = [];

  host.innerHTML = '<p class="center" id="buTask"></p><div class="bubble-field" id="buField"></div>' +
    '<p class="center muted" id="buScore"></p>' +
    '<div class="btn-row" style="justify-content:center">' +
    '<button class="btn ghost" data-bu="new">' + icon('undo') + ' Новый цвет</button></div>' +
    '<p class="muted center">Смысл не в счёте, а в том, чтобы руки и глаза были заняты. ' +
    'Можно бросить в любой момент.</p>';
  var field = host.querySelector('#buField');

  function label() {
    host.querySelector('#buTask').innerHTML = 'Лопай <b style="color:' + COLORS[target].css + '">' +
      COLORS[target].name + '</b> шарики';
    host.querySelector('#buScore').textContent = 'Лопнуто: ' + score + (miss ? ' · мимо: ' + miss : '');
  }
  function spawn() {
    if (items.length > 13) return;
    var ci = Math.floor(Math.random() * COLORS.length);
    var size = 34 + Math.random() * 34;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bubble';
    b.style.width = b.style.height = size + 'px';
    b.style.left = Math.random() * (field.offsetWidth - size) + 'px';
    b.style.top = field.offsetHeight + 'px';
    b.style.background = 'radial-gradient(circle at 33% 30%, #ffffff88, ' + COLORS[ci].css + ')';
    b.dataset.col = ci;
    field.appendChild(b);
    var y = field.offsetHeight, sp = 0.4 + Math.random() * 0.8;
    var it = { el: b, y: y, sp: sp };
    items.push(it);
  }
  function step() {
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.y -= it.sp;
      it.el.style.top = it.y + 'px';
      if (it.y < -90) { it.el.remove(); items.splice(i, 1); }
    }
    if (Math.random() < 0.06) spawn();
  }
  function startGame() {
    target = Math.floor(Math.random() * COLORS.length);
    score = 0; miss = 0;
    items.forEach(function (i) { i.el.remove(); });
    items = [];
    label();
    clearInterval(timer);
    timer = setInterval(step, 24);
  }
  field.addEventListener('click', function (ev) {
    var b = ev.target.closest('.bubble');
    if (!b) return;
    if (+b.dataset.col === target) { score++; } else { miss++; }
    for (var i = 0; i < items.length; i++) if (items[i].el === b) { items.splice(i, 1); break; }
    b.remove();
    label();
  });
  host.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-bu]')) startGame();
  });
  startGame();
}

/* Правило пяти минут: любое простое дело руками, пять минут — и можно бросить */
function exRule5(e, host) {
  var idea = RULE5_IDEAS[Math.floor(Math.random() * RULE5_IDEAS.length)];
  var left = 300, iv = null, running = false;
  function fmt(s2) { return pad2(Math.floor(s2 / 60)) + ':' + pad2(s2 % 60); }
  function draw() {
    host.innerHTML = '<div class="deck-card">Пять минут на то, чтобы <b>' + esc(idea) + '</b></div>' +
      '<div class="big-count">' + fmt(left) + '</div>' +
      '<p class="center muted">' + (left <= 0 ? 'Время вышло. Можно спокойно бросать.' :
        'Голове в тревоге нужно занятое тело, а не экран') + '</p>' +
      '<div class="btn-row" style="justify-content:center">' +
      (left > 0 ? '<button class="btn" data-r5="go">' + icon(running ? 'pause' : 'play') +
        (running ? ' Пауза' : ' Поехали') + '</button>' : '') +
      '<button class="btn ghost" data-r5="other">' + icon('undo') + ' Другое дело</button></div>' +
      '<p class="muted center">Через пять минут можно честно остановиться. Обычно к этому ' +
      'моменту уже не хочется — но разрешение бросить важнее результата.</p>';
  }
  draw();
  host.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-r5]');
    if (!b) return;
    if (b.dataset.r5 === 'other') {
      clearInterval(iv); iv = null; running = false; left = 300;
      var next;
      do { next = RULE5_IDEAS[Math.floor(Math.random() * RULE5_IDEAS.length)]; }
      while (next === idea && RULE5_IDEAS.length > 1);
      idea = next;
      draw();
      return;
    }
    if (running) { clearInterval(iv); iv = null; running = false; draw(); return; }
    running = true; draw();
    iv = setInterval(function () {
      left--;
      if (left <= 0) { clearInterval(iv); iv = null; running = false; praise(); }
      draw();
    }, 1000);
  });
}

/* Ещё не перенесённые упражнения — открываем в исходной «Аптечке», чтобы ничего не терялось */
function exNotYet(e, host) {
  host.innerHTML = '<div class="note"><p>Это упражнение пока живёт в старой версии «Аптечки» — ' +
    'мы переносим их по очереди. Оно полностью рабочее, просто откроется в новой вкладке.</p></div>' +
    '<a class="btn" href="' + ORIGIN + '/ex/' + e.id + '/" target="_blank" rel="noopener noreferrer">' +
    'Открыть упражнение ' + icon('right') + '</a>';
}

/* ---------- Старт ---------- */
document.addEventListener('DOMContentLoaded', function () {
  var root = document.getElementById('panicRoot');
  if (!root) return;
  var page = location.pathname.split('/').pop() || 'index.html';
  if (page.indexOf('list') === 0) renderPanicList(root);
  else if (page.indexOf('ex') === 0) renderPanicEx(root);
  else renderPanicHome(root);
  mountIcons(root);

  document.body.addEventListener('click', function (ev) {
    var f = ev.target.closest('[data-fav]');
    if (!f) return;
    var on = toggleFav(f.dataset.fav);
    f.setAttribute('aria-pressed', on ? 'true' : 'false');
    toast(on ? 'Добавлено в твою аптечку' : 'Убрано из аптечки');
  });
});
