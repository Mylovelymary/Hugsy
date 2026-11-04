/* Раздел «Дела»: чеклист, дробление задач, таймер фокуса, инструменты под СДВГ.
   Тон: никогда не укоряем за пропуски. Серия не обнуляется.

   Блоки под СДВГ (очередь 3 роадмапа): силы на сегодня, лесенка запуска,
   круг таймера, полоса дня, оценка времени против факта, напоминания,
   разбор ящика мыслей. Сам ящик общий и живёт в app.js. */

var routine = { date: '', tasks: [] };
var tcfg = { focus: 20, brk: 5 };
var timer = { left: 0, run: false, mode: 'focus', iv: null };

/* Силы на сегодня. Не оценка человека, а честный ответ на вопрос «что сейчас есть».
   На «мало» список сам сжимается до трёх пунктов: выбор тоже отнимает силы. */
var ENERGY = [
  { id: 'low',  label: 'Сил мало',     note: 'Понял. Оставил три пункта, остальное подождёт и не испортится.' },
  { id: 'mid',  label: 'Обычный день', note: 'Обычный день. Список целиком, начинать можно с любого места.' },
  { id: 'high', label: 'Много сил',    note: 'Есть запал. Хороший момент для того, что давно висит.' }
];
var LOW_LIMIT = 3;
var energy = { date: '', level: 'mid' };
var showAllTasks = false;

/* Лесенка запуска: три ступени от тела к делу. Смысл не в том, чтобы заставить
   «начать работать», а в том, чтобы спуститься до шага, от которого глупо отказаться.
   Ступень не сработала — это не провал, а просто не та ступень. */
var LADDER = [
  {
    name: 'Шаг телом',
    hint: 'Ничего умственного, только движение: мозгу проще догнать тело, чем наоборот.',
    items: [
      'Встань и налей себе воды. Потом вернись сюда.',
      'Открой то, в чём надо работать, и просто смотри. Делать пока не нужно.',
      'Положи на стол одну вещь, которая нужна для дела. Одну.',
      'Дойди до другой комнаты и обратно.',
      'Сядь ровно и сделай три медленных выдоха.'
    ]
  },
  {
    name: 'Две минуты',
    hint: 'Ставим таймер на две минуты. Через две минуты можно честно всё бросить.',
    items: [
      'Две минуты делай самое начало. Звонок — и можно уходить.',
      'Две минуты на самый противный кусок. Дальше по желанию.',
      'Две минуты просто перебирай то, что лежит перед тобой.',
      'Две минуты вслух проговаривай, что видишь и что собираешься сделать.'
    ]
  },
  {
    name: 'Сделай плохо',
    hint: 'Планка — главный тормоз. Разрешаем себе черновик, который стыдно показывать.',
    items: [
      'Сделай нарочно плохо. Плохое можно поправить, несделанное — нет.',
      'Напиши самый кривой вариант. Он не финальный, он просто первый.',
      'Начни с середины. Красивое начало придумаешь, когда будет что начинать.',
      'Сделай четверть и оставь. Четверть — это не ноль.'
    ]
  }
];
var ladder = { step: 0, pick: [0, 0, 0] };

var DAY_FROM = 6;   // полоса дня идёт с 6 утра до полуночи
var DAY_TO = 24;
var dayIv = null;

var EST_PRESETS = [5, 15, 30, 60];
var askFactFor = '';   // id задачи, у которой сейчас спрашиваем факт

/* ---------- Данные ---------- */
function rLoad() {
  routine = Store.get('routine', null) || { date: todayKey(), tasks: [] };
  tcfg = Store.get('timer.cfg', null) || { focus: 20, brk: 5 };
  if (routine.date !== todayKey()) {
    // Новый день: задачи оставляем, галочки снимаем. Без упрёков.
    for (var i = 0; i < routine.tasks.length; i++) {
      routine.tasks[i].done = false;
      routine.tasks[i].fact = 0;
      var st = routine.tasks[i].steps || [];
      for (var j = 0; j < st.length; j++) st[j].done = false;
    }
    routine.date = todayKey();
    rSave();
    document.getElementById('dayNote').textContent =
      'Новый день — галочки сняты, задачи остались. Начать можно с любой.';
  }

  energy = Store.get('energy', null) || { date: '', level: 'mid' };
  if (energy.date !== todayKey()) energy = { date: todayKey(), level: 'mid' };
}
function rSave() { Store.set('routine', routine); }
function eSave() { energy.date = todayKey(); Store.set('energy', energy); }

function markVisit() {
  var s = Store.get('streak', { last: '', n: 0, days: 0 });
  if (s.last !== todayKey()) {
    var y = new Date(Date.now() - 864e5);
    var ykey = y.getFullYear() + '-' + pad2(y.getMonth() + 1) + '-' + pad2(y.getDate());
    s.n = (s.last === ykey) ? s.n + 1 : 1;
    s.days = (s.days || 0) + 1;
    s.last = todayKey();
    Store.set('streak', s);
  }
  var txt = 'Всего дней с заходом: ' + s.days + '. Подряд сейчас: ' + s.n + '.';
  if (s.n >= 3) txt += ' Это уже привычка 🎉';
  var host = document.getElementById('streak');
  host.innerHTML = weekStripHTML(Store.get('days.done', {}), false) +
    '<p class="muted" style="margin:12px 0 0">' + esc(txt) + '</p>';
}

/* ---------- Силы на сегодня ---------- */
function renderEnergy() {
  var html = '';
  for (var i = 0; i < ENERGY.length; i++) {
    html += '<button type="button" data-energy="' + ENERGY[i].id + '" aria-pressed="' +
      (energy.level === ENERGY[i].id) + '">' + esc(ENERGY[i].label) + '</button>';
  }
  document.getElementById('energy').innerHTML = html;
  var cur = ENERGY.filter(function (x) { return x.id === energy.level; })[0] || ENERGY[1];
  document.getElementById('energyNote').textContent = cur.note;
}

/* ---------- Задачи ---------- */
function taskHTML(t) {
  var html = '<div class="task' + (t.done ? ' done' : '') + '">' +
    '<input type="checkbox" data-done="' + t.id + '"' + (t.done ? ' checked' : '') +
    ' aria-label="Выполнено: ' + esc(t.title) + '">' +
    '<div class="body"><div class="ttl">' + esc(t.title) + '</div>';

  var meta = [];
  if (t.time) meta.push(icon('clock') + ' ' + esc(t.time));
  if (t.est) meta.push(icon('Hourglass') + ' ' + t.est + ' мин на глаз');
  if (t.fact) meta.push(icon('check') + ' вышло ' + t.fact + ' мин');
  if (meta.length) html += '<div class="meta">' + meta.join(' · ') + '</div>';

  if (t.steps && t.steps.length) {
    html += '<ul class="steps">';
    for (var j = 0; j < t.steps.length; j++) {
      html += '<li><label><input type="checkbox"' +
        ' data-sub="' + t.id + ':' + j + '"' + (t.steps[j].done ? ' checked' : '') + '>' +
        (t.steps[j].done ? '<s>' + esc(t.steps[j].text) + '</s>' : esc(t.steps[j].text)) + '</label></li>';
    }
    html += '</ul>';
  }

  if (askFactFor === t.id) html += factFormHTML(t);

  html += '</div><div style="white-space:nowrap">' +
    '<button class="row-ic" data-split="' + t.id + '" title="Разбить на шаги" ' +
    'aria-label="Разбить на шаги">' + icon('steps') + '</button>' +
    '<button class="row-ic danger" data-rm="' + t.id + '" title="Удалить" ' +
    'aria-label="Удалить задачу">' + icon('trash') + '</button></div></div>';
  return html;
}

function renderTasks() {
  var host = document.getElementById('tasks');
  if (!routine.tasks.length) {
    // Маскот тут не нужен: тот же гусь уже стоит в шапке страницы, два подряд путают
    host.innerHTML = '<div class="empty">' +
      '<p>На сегодня пусто. Добавь одну задачу — не самую важную, а самую маленькую.</p></div>';
    renderDayBar();
    return;
  }

  // В день, когда сил мало, показываем три пункта: длинный список сам по себе
  // забирает силы. Спрятать — не то же самое, что отменить: остальное на месте.
  var list = routine.tasks;
  var hidden = 0;
  if (energy.level === 'low' && !showAllTasks) {
    var head = [];
    for (var i = 0; i < routine.tasks.length; i++) {
      var t0 = routine.tasks[i];
      if (head.length < LOW_LIMIT || t0.done || askFactFor === t0.id) head.push(t0);
    }
    hidden = routine.tasks.length - head.length;
    list = head;
  }

  var html = '';
  for (var k = 0; k < list.length; k++) html += taskHTML(list[k]);

  if (hidden > 0) {
    html += '<button class="btn sm ghost" data-act="showall" style="margin-top:10px">' +
      'Показать остальные (' + hidden + ')</button>' +
      '<p class="muted" style="margin-top:8px">Сегодня хватит и одного пункта из трёх.</p>';
  } else if (energy.level === 'low' && showAllTasks) {
    html += '<button class="btn sm ghost" data-act="showless" style="margin-top:10px">Снова оставить три</button>';
  }

  var doneN = routine.tasks.filter(function (x) { return x.done; }).length;
  html += '<p class="muted">Сделано: ' + doneN + ' из ' + routine.tasks.length + '.' +
    (doneN ? ' Этого уже достаточно, чтобы день считался не зря.' : '') + '</p>';
  host.innerHTML = html;
  renderDayBar();
}

function renderTaskForm() {
  var chips = '';
  for (var i = 0; i < EST_PRESETS.length; i++) {
    chips += '<button type="button" data-est="' + EST_PRESETS[i] + '">' + EST_PRESETS[i] + ' мин</button>';
  }
  document.getElementById('taskForm').innerHTML =
    '<div class="card soft" style="margin-top:14px" id="tf">' +
    '<label class="f"><span>Что нужно сделать</span><input type="text" id="tTitle" placeholder="Например: разобрать один ящик"></label>' +
    '<div class="f"><span>Во сколько (необязательно)</span>' + timeFieldHTML('tTime', '', true) + '</div>' +
    '<div class="esti"><span>Сколько, кажется, это займёт? Необязательно — но из таких догадок ' +
    'собирается твой личный коэффициент времени.</span>' +
    '<div class="chips" id="estChips">' + chips +
    '<button type="button" data-est="0" aria-pressed="true">Не знаю</button></div>' +
    '<p class="muted" id="estHint" style="margin:8px 0 0"></p></div>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn" data-act="savetask">Добавить</button>' +
    '<button class="btn ghost" data-act="canceltask">Отмена</button></div></div>';
  document.getElementById('tTitle').focus();
}

function findTask(id) {
  for (var i = 0; i < routine.tasks.length; i++) if (routine.tasks[i].id === id) return routine.tasks[i];
  return null;
}

/* ---------- Оценка времени против факта ----------
   Недооценка времени при СДВГ — не черта характера, а измеримая величина.
   Если её знать, её можно просто закладывать в план. Поэтому здесь нет
   ни одного «ты опять не уложился» — только число. */
function biasData() {
  var log = Store.get('time.log', []);
  var se = 0, sf = 0;
  for (var i = 0; i < log.length; i++) { se += log[i].est; sf += log[i].fact; }
  return { n: log.length, coef: se ? sf / se : 0 };
}

function biasApply(minutes) {
  var b = biasData();
  if (b.n < 3 || !minutes) return 0;
  return Math.max(5, Math.round(minutes * b.coef / 5) * 5);
}

function renderBias() {
  var b = biasData();
  var host = document.getElementById('bias');
  if (b.n < 3) {
    host.innerHTML = '<p class="muted" style="margin:0">Отмечено оценок: ' + b.n +
      ' из 3. После третьей здесь появится твой коэффициент — во сколько раз дела ' +
      'обычно длиннее, чем кажутся.</p>';
    return;
  }
  var c = b.coef;
  var word = c >= 1.15
    ? 'Значит, при планировании смело умножай. Это не про «плохо старался» — это твой масштаб времени, и его можно просто учитывать.'
    : (c <= 0.9
      ? 'Ты закладываешь время с запасом. Можно спокойнее относиться к своим оценкам.'
      : 'Твои оценки близки к правде. Редкое умение, если честно.');
  // Запятая, а не точка: это русский интерфейс
  host.innerHTML = '<div class="bias"><b>&times;' + c.toFixed(1).replace('.', ',') + '</b>' +
    '<span>во столько раз дела обычно длиннее, чем кажется. По ' + b.n + ' отметкам.</span></div>' +
    '<p class="muted" style="margin:8px 0 0">' + esc(word) + '</p>';
}

function factFormHTML(t) {
  var base = t.est || 15;
  var opts = [base, Math.round(base * 1.5), base * 2, base * 3];
  var chips = '';
  for (var i = 0; i < opts.length; i++) {
    chips += '<button type="button" data-fact="' + t.id + ':' + opts[i] + '">' + opts[i] + ' мин</button>';
  }
  return '<div class="esti"><span>Сделано. А сколько ушло на самом деле? ' +
    'Это нужно только для твоего коэффициента — оценивать тебя никто не будет.</span>' +
    '<div class="chips">' + chips +
    '<button type="button" data-fact="' + t.id + ':skip">Пропустить</button></div></div>';
}

function logFact(t, fact) {
  if (!t.est || !fact) return;
  var log = Store.get('time.log', []);
  log.push({ est: t.est, fact: fact, ts: todayKey() });
  if (log.length > 40) log = log.slice(log.length - 40);
  Store.set('time.log', log);
  t.fact = fact;
  rSave();
  renderBias();
}

/* ---------- Полоса дня ----------
   При СДВГ время плохо ощущается изнутри. Полоса показывает его снаружи:
   сколько дня прошло, сколько осталось и куда попадают задачи со временем.
   Прошедшая часть просто серая — никакого «ты потерял полдня». */
function renderDayBar() {
  var host = document.getElementById('daybar');
  if (!host) return;
  var d = new Date();
  var nowH = d.getHours() + d.getMinutes() / 60;
  var span = DAY_TO - DAY_FROM;
  var pos = function (h) { return Math.max(0, Math.min(100, (h - DAY_FROM) / span * 100)); };

  var html = '<div class="past" style="width:' + pos(nowH).toFixed(1) + '%"></div>';
  for (var h = DAY_FROM + 3; h < DAY_TO; h += 3) {
    html += '<div class="hour" style="left:' + pos(h).toFixed(1) + '%">' + h + ':00</div>';
  }

  var placed = 0;
  for (var i = 0; i < routine.tasks.length; i++) {
    var t = routine.tasks[i];
    if (!t.time) continue;
    var p = t.time.split(':');
    var th = parseInt(p[0], 10) + parseInt(p[1], 10) / 60;
    if (th < DAY_FROM || th > DAY_TO) continue;
    placed++;
    html += '<div class="slot' + (t.done ? ' done' : '') + '" style="left:' + pos(th).toFixed(1) + '%">' +
      '<span>' + esc(t.title) + '</span><b></b></div>';
  }

  if (nowH >= DAY_FROM && nowH <= DAY_TO) {
    var np = pos(nowH);
    html += '<div class="now' + (np > 82 ? ' end' : '') + '" style="left:' + np.toFixed(1) + '%"></div>';
  }
  host.innerHTML = html;

  var left = Math.max(0, Math.round(DAY_TO - nowH));
  var note;
  if (nowH < DAY_FROM || nowH >= DAY_TO) {
    note = 'Сейчас время не для дел. Полоса начнётся заново утром.';
  } else {
    note = 'До полуночи примерно ' + left + ' ' + plural(left, 'час', 'часа', 'часов') + '.' +
      (placed ? '' : ' Поставь задаче время — она появится на полосе.');
  }
  document.getElementById('daybarNote').textContent = note;
}

/* ---------- Лесенка запуска ---------- */
function ladderPickAll() {
  for (var i = 0; i < LADDER.length; i++) {
    ladder.pick[i] = Math.floor(Math.random() * LADDER[i].items.length);
  }
}

function renderLadder() {
  var html = '';
  for (var i = 0; i < LADDER.length; i++) {
    var st = LADDER[i];
    var cls = i === ladder.step ? ' on' : (i < ladder.step ? ' past' : '');
    html += '<div class="rung' + cls + '"><span class="num">' + (i + 1) + '</span>' +
      '<div class="rtxt"><span class="rname">' + esc(st.name) + '</span>' +
      (i === ladder.step
        ? '<div class="rtask">' + esc(st.items[ladder.pick[i]]) + '</div>'
        : '<span>' + esc(st.hint) + '</span>') +
      '</div></div>';
  }
  document.getElementById('ladder').innerHTML = html;

  var btns = '<button class="btn sm" data-act="rung-ok">Получилось</button>' +
    '<button class="btn sm ghost" data-act="rung-other">Другой вариант</button>';
  if (ladder.step === 1) {
    btns += '<button class="btn sm ghost" data-act="rung-timer">Поставить 2 минуты</button>';
  }
  btns += ladder.step < LADDER.length - 1
    ? '<button class="btn sm ghost" data-act="rung-next">Не пошло, ступень ниже</button>'
    : '<button class="btn sm ghost" data-act="rung-stop">Сегодня не идёт</button>';
  document.getElementById('ladderBtns').innerHTML = btns;
}

/* ---------- Таймер ---------- */
function fmtClock(sec) {
  return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
}
var FOCUS_PRESETS = [7, 15, 20, 25, 45];
var BRK_PRESETS = [3, 5, 10];
var RING_LEN = 339.292;   // длина окружности радиуса 54

/* Кнопки «−» и «+» и готовые значения вместо поля со стрелочками:
   по ним реально попасть пальцем, и не надо ничего печатать. */
function renderTimerControls() {
  document.getElementById('focusVal').textContent = tcfg.focus;
  document.getElementById('brkVal').textContent = tcfg.brk;
  document.getElementById('focusUnit').textContent = plural(tcfg.focus, 'минута', 'минуты', 'минут');
  document.getElementById('brkUnit').textContent = plural(tcfg.brk, 'минута', 'минуты', 'минут');

  var fh = '';
  for (var i = 0; i < FOCUS_PRESETS.length; i++) {
    fh += '<button type="button" data-preset="focus:' + FOCUS_PRESETS[i] + '" aria-pressed="' +
          (tcfg.focus === FOCUS_PRESETS[i]) + '">' + FOCUS_PRESETS[i] + ' мин</button>';
  }
  document.getElementById('focusPresets').innerHTML = fh;

  var bh = '';
  for (var j = 0; j < BRK_PRESETS.length; j++) {
    bh += '<button type="button" data-preset="brk:' + BRK_PRESETS[j] + '" aria-pressed="' +
          (tcfg.brk === BRK_PRESETS[j]) + '">' + BRK_PRESETS[j] + ' мин</button>';
  }
  document.getElementById('brkPresets').innerHTML = bh;

  var btns = document.querySelectorAll('.sbtn');
  for (var k = 0; k < btns.length; k++) {
    if (!btns[k].firstChild) {
      btns[k].innerHTML = icon(btns[k].dataset.tstep.indexOf('-') > 0 ? 'minus' : 'plus');
    }
  }
  document.querySelector('[data-tstep="focus:-5"]').disabled = tcfg.focus <= 1;
  document.querySelector('[data-tstep="focus:5"]').disabled = tcfg.focus >= 90;
  document.querySelector('[data-tstep="brk:-1"]').disabled = tcfg.brk <= 1;
  document.querySelector('[data-tstep="brk:1"]').disabled = tcfg.brk >= 30;
}

function setTimerCfg(key, value) {
  if (key === 'focus') tcfg.focus = Math.max(1, Math.min(90, value));
  else tcfg.brk = Math.max(1, Math.min(30, value));
  Store.set('timer.cfg', tcfg);
  renderTimerControls();
  if (!timer.run) tReset(timer.mode);
}

/* Круг вместо голых цифр: так видно, сколько времени осталось, а не только
   сколько натикало. Цифры никуда не делись — круг их дополняет.
   В «Тихом режиме» и при prefers-reduced-motion кольцо движется без плавности. */
function tClock() {
  document.getElementById('clock').textContent = fmtClock(timer.left);
  // Пока таймер стоит, под числом «минут» — иначе непонятно, 20 чего это.
  // Когда пошёл отсчёт, честнее «осталось»: там уже минуты и секунды.
  document.getElementById('ringUnit').textContent = timer.run ? 'осталось' : 'минут';
  var total = (timer.mode === 'focus' ? tcfg.focus : tcfg.brk) * 60;
  var left = Math.max(0, Math.min(1, total ? timer.left / total : 0));
  var ring = document.getElementById('ringFg');
  if (ring) ring.setAttribute('stroke-dashoffset', (RING_LEN * (1 - left)).toFixed(1));
}

function tRender() {
  tClock();
  document.getElementById('tstart').innerHTML =
    timer.run ? icon('pause') + ' Пауза' : icon('play') + ' Начать';
  document.getElementById('tstate').textContent = timer.mode === 'focus'
    ? 'Фокус. Делай одно дело, остальное потом.'
    : 'Перерыв. Встань, разомнись, попей воды.';
}
function tReset(mode) {
  clearInterval(timer.iv);
  timer.iv = null;
  timer.run = false;
  timer.mode = mode || 'focus';
  timer.left = (timer.mode === 'focus' ? tcfg.focus : tcfg.brk) * 60;
  tRender();
}
function tToggle() {
  if (timer.run) {
    clearInterval(timer.iv);
    timer.iv = null;
    timer.run = false;
    tRender();
    return;
  }
  timer.run = true;
  tRender();
  timer.iv = setInterval(function () {
    timer.left--;
    if (timer.left <= 0) {
      clearInterval(timer.iv);
      timer.iv = null;
      timer.run = false;
      var wasFocus = timer.mode === 'focus';
      softNotify(wasFocus ? 'Отрезок фокуса закончен. Пингвин доволен 🐧'
                          : 'Перерыв закончен. Можно ещё один отрезок.');
      tReset(wasFocus ? 'break' : 'focus');
      return;
    }
    tClock();
  }, 1000);
}

function askNotifyPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      var r = Notification.requestPermission();
      if (r && r.then) r.then(renderReminders).catch(function () {});
    }
  } catch (e) {}
}

/* ---------- Напоминания ----------
   Только свои: текст пишет человек, время ставит человек, выключается в одно касание.
   Никаких «ты давно не заходил» — это прямой запрет из CLAUDE.md. */
function renderReminders() {
  var list = remGet();
  var host = document.getElementById('remList');
  if (!list.length) {
    host.innerHTML = '<p class="muted" style="margin:10px 0 0">Пока ни одного. Сами мы ничего ' +
      'не придумаем и дёргать не станем — придёт только то, что поставишь здесь.</p>';
  } else {
    var html = '<ul class="rem-list">';
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      html += '<li class="' + (r.on ? '' : 'off') + '"><span class="rt">' + esc(r.time) + '</span>' +
        '<span class="rx">' + esc(r.text) + '</span>' +
        '<button class="row-ic" data-rem-on="' + r.id + '" aria-pressed="' + !!r.on + '"' +
        ' title="' + (r.on ? 'Поставить на паузу' : 'Снова включить') + '"' +
        ' aria-label="' + (r.on ? 'Поставить напоминание на паузу' : 'Снова включить напоминание') + '">' +
        icon(r.on ? 'pause' : 'play') + '</button>' +
        '<button class="row-ic danger" data-rem-del="' + r.id +
        '" title="Удалить" aria-label="Удалить напоминание">' + icon('trash') + '</button></li>';
    }
    html += '</ul>';
    host.innerHTML = html;
  }

  renderRemChip();   // чип над кнопкой «Мысль» показывает ближайшее напоминание

  var state = document.getElementById('remState');
  var can = ('Notification' in window);
  var perm = can ? Notification.permission : 'unsupported';
  if (perm === 'granted') {
    state.innerHTML = 'Уведомления разрешены. Они приходят, пока вкладка с Хагси открыта: ' +
      'своего сервера у нас нет, и обещать больше было бы нечестно.';
  } else if (!can || perm === 'denied') {
    state.innerHTML = 'Браузер уведомления не пропускает — ничего страшного. Напоминание ' +
      'всё равно всплывёт подсказкой на странице, пока Хагси открыт.';
  } else {
    state.innerHTML = 'Чтобы напоминание было видно за пределами вкладки, нужно разрешение браузера. ' +
      '<button class="btn sm ghost" data-act="remperm" style="margin-left:6px">Разрешить уведомления</button>';
  }
}

function addReminder() {
  var time = document.getElementById('remTime').value;
  var text = document.getElementById('remText').value.trim();
  if (!time) { toast('Поставь время'); return; }
  var list = remGet();
  list.push({ id: uid(), time: time, text: text || 'Напоминание, которое ты себе поставил', on: true, fired: '' });
  list.sort(function (a, b) { return minutesOf(a.time) - minutesOf(b.time); });
  remSave(list);
  document.getElementById('remText').value = '';
  timeFieldSet('remTime', '');
  renderReminders();
  toast('Поставлено. Напомню мягко');
  askNotifyPermission();
}

/* ---------- Разбор ящика мыслей ----------
   Сам ящик в app.js и есть на каждой странице. Здесь он разбирается:
   мысль становится задачей или уходит. Не разобрать — тоже нормально. */
function renderInboxCard() {
  var host = document.getElementById('inboxCard');
  if (!host) return;
  var list = inboxGet();
  if (!list.length) {
    host.innerHTML = '<p class="muted" style="margin:0">Ящик пуст. Кнопка «Мысль» есть в углу ' +
      'любой страницы — бросай туда всё, что лезет в голову не вовремя.</p>';
    return;
  }
  var html = '<ul class="rem-list">';
  for (var i = 0; i < list.length; i++) {
    html += '<li><span class="rx">' + esc(list[i].text) + '</span>' +
      '<button class="btn sm ghost" data-ibx-task="' + list[i].id + '">В задачу</button>' +
      '<button class="row-ic danger" data-ibx-del="' + list[i].id +
      '" title="Убрать" aria-label="Убрать записку">' + icon('trash') + '</button></li>';
  }
  html += '</ul>';
  host.innerHTML = html;
}

/* ---------- Скрытие блоков ----------
   Страница большая, и не всё нужно каждому: кому-то мешает таймер, кому-то лесенка.
   Блок убирается крестиком в своём углу и возвращается списком внизу страницы.
   Ничего не удаляется — только прячется, и всегда видно, что спрятано. */
var CARDS = [
  { id: 'energy', name: 'Сколько сегодня сил' },
  { id: 'daybar', name: 'Полоса дня' },
  { id: 'ladder', name: 'Не могу начать' },
  { id: 'timer',  name: 'Таймер фокуса' },
  { id: 'bias',   name: 'Сколько уходит времени' },
  { id: 'rem',    name: 'Напоминания' },
  { id: 'inbox',  name: 'Ящик мыслей' },
  { id: 'streak', name: 'Дни, когда ты заходишь' }
];

function hiddenCards() { return Store.get('routine.hidden', []); }

function setCardHidden(id, hide) {
  var list = hiddenCards();
  var i = list.indexOf(id);
  if (hide && i < 0) list.push(id);
  if (!hide && i >= 0) list.splice(i, 1);
  Store.set('routine.hidden', list);
  applyHidden();
}

function applyHidden() {
  var list = hiddenCards();
  for (var i = 0; i < CARDS.length; i++) {
    var card = document.querySelector('[data-card="' + CARDS[i].id + '"]');
    if (card) card.hidden = list.indexOf(CARDS[i].id) >= 0;
  }

  var host = document.getElementById('hiddenCards');
  if (!host) return;
  if (!list.length) { host.innerHTML = ''; return; }

  var html = '<div class="card soft"><h3>' + icon('undo') + 'Скрытые блоки</h3>' +
    '<p class="muted">Они никуда не делись. Верни тот, который снова пригодится.</p>' +
    '<div class="btn-row">';
  for (var j = 0; j < CARDS.length; j++) {
    if (list.indexOf(CARDS[j].id) < 0) continue;
    html += '<button class="btn sm ghost" data-show="' + CARDS[j].id + '">' +
      icon('plus') + ' ' + esc(CARDS[j].name) + '</button>';
  }
  host.innerHTML = html + '</div></div>';
  mountIcons(host);
}

/* Кнопку «скрыть» ставим в угол каждого блока из списка */
function mountHideButtons() {
  for (var i = 0; i < CARDS.length; i++) {
    var card = document.querySelector('[data-card="' + CARDS[i].id + '"]');
    if (!card || card.querySelector('.card-hide')) continue;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-hide';
    btn.dataset.hide = CARDS[i].id;
    btn.title = 'Скрыть блок';
    btn.setAttribute('aria-label', 'Скрыть блок «' + CARDS[i].name + '»');
    btn.innerHTML = icon('close');
    card.classList.add('has-hide');
    card.appendChild(btn);
  }
}

/* ---------- Добавление мысли прямо на странице ----------
   Раньше положить мысль можно было только из плавающей кнопки — на самой странице
   ящика кнопки не было, и это сбивало с толку. */
function renderInboxAdd() {
  var host = document.getElementById('inboxAdd');
  if (!host) return;
  host.innerHTML =
    '<div class="inbox-add">' +
    '<textarea id="inboxPageText" rows="2" placeholder="Что всплыло в голове"></textarea>' +
    '<div class="btn-row" style="margin-top:10px">' +
    micBtnHTML('data-ibx-mic="1"') +
    '<button class="btn sm" data-ibx-add="1">' + icon('plus') + ' Добавить мысль</button>' +
    '</div></div>';
  mountIcons(host);
}

/* ---------- Старт ---------- */
function rInit() {
  rLoad();
  renderEnergy();
  renderTasks();
  renderBias();
  renderReminders();
  renderInboxAdd();
  renderInboxCard();
  mountHideButtons();
  applyHidden();
  markVisit();

  document.getElementById('remTimeHost').innerHTML = timeFieldHTML('remTime', '', false);

  renderTimerControls();
  tReset('focus');
  ladderPickAll();
  renderLadder();
  mountIcons();

  // Полоса дня живёт по часам: без обновления метка «сейчас» начинает врать
  dayIv = setInterval(renderDayBar, 60000);

  // Пришли по кружку с будильником — доводим до блока напоминаний сами:
  // браузер прыгает к якорю раньше, чем блок отрисован
  if (location.hash === '#remCard' || location.hash === '#inboxCard') {
    var target = document.querySelector(location.hash);
    if (target) setTimeout(function () { target.scrollIntoView({ block: 'start' }); }, 60);
  }

  document.getElementById('tstart').addEventListener('click', function () {
    // Разрешение на уведомления спрашиваем только по явному действию человека
    askNotifyPermission();
    tToggle();
  });

  document.body.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.done) {
      var t = findTask(el.dataset.done);
      if (t) {
        t.done = el.checked;
        if (el.checked && t.est && !t.fact) askFactFor = t.id;
        if (!el.checked && askFactFor === t.id) askFactFor = '';
        rSave();
        renderTasks();
        if (el.checked) {
          markDay();          // день попадает в недельную ленту
          markVisit();
          praise();
        }
      }
      return;
    }
    if (el.dataset.sub) {
      var parts = el.dataset.sub.split(':');
      var task = findTask(parts[0]);
      if (task && task.steps[parts[1]]) {
        task.steps[parts[1]].done = el.checked;
        rSave();
        renderTasks();
      }
    }
  });

  document.body.addEventListener('click', function (e) {
    var st = e.target.closest('[data-tstep]');
    if (st) {
      var ps = st.dataset.tstep.split(':');
      setTimerCfg(ps[0], (ps[0] === 'focus' ? tcfg.focus : tcfg.brk) + parseInt(ps[1], 10));
      return;
    }
    var pr = e.target.closest('[data-preset]');
    if (pr) {
      var pp = pr.dataset.preset.split(':');
      setTimerCfg(pp[0], parseInt(pp[1], 10));
      return;
    }
    var en = e.target.closest('[data-energy]');
    if (en) {
      energy.level = en.dataset.energy;
      showAllTasks = false;
      eSave();
      renderEnergy();
      renderTasks();
      return;
    }
    var es = e.target.closest('[data-est]');
    if (es) {
      var chips = document.getElementById('estChips').querySelectorAll('button');
      for (var c = 0; c < chips.length; c++) {
        chips[c].setAttribute('aria-pressed', chips[c] === es ? 'true' : 'false');
      }
      var real = biasApply(parseInt(es.dataset.est, 10));
      document.getElementById('estHint').textContent = real
        ? 'По твоим прошлым отметкам это скорее ' + real + ' ' +
          plural(real, 'минута', 'минуты', 'минут') + '. Можно сразу заложить столько.'
        : '';
      return;
    }
    var fa = e.target.closest('[data-fact]');
    if (fa) {
      var fp = fa.dataset.fact.split(':');
      var ft = findTask(fp[0]);
      if (ft && fp[1] !== 'skip') logFact(ft, parseInt(fp[1], 10));
      askFactFor = '';
      renderTasks();
      return;
    }
    var ro = e.target.closest('[data-rem-on]');
    if (ro) {
      var rl = remGet();
      for (var i = 0; i < rl.length; i++) {
        if (rl[i].id === ro.dataset.remOn) { rl[i].on = !rl[i].on; rl[i].fired = ''; }
      }
      remSave(rl);
      renderReminders();
      return;
    }
    var rd = e.target.closest('[data-rem-del]');
    if (rd) {
      remSave(remGet().filter(function (x) { return x.id !== rd.dataset.remDel; }));
      renderReminders();
      return;
    }
    var ibt = e.target.closest('[data-ibx-task]');
    if (ibt) {
      var item = inboxGet().filter(function (x) { return x.id === ibt.dataset.ibxTask; })[0];
      if (item) {
        routine.tasks.push({ id: uid(), title: item.text, time: '', est: 0, fact: 0, done: false, steps: [] });
        rSave();
        inboxDel(item.id);
        renderInboxCard();
        inboxRender();
        renderTasks();
        toast('Переехало в задачи на сегодня');
      }
      return;
    }
    var hide = e.target.closest('[data-hide]');
    if (hide) { setCardHidden(hide.dataset.hide, true); toast('Блок скрыт. Вернуть можно внизу страницы'); return; }
    var show = e.target.closest('[data-show]');
    if (show) { setCardHidden(show.dataset.show, false); return; }

    var ibxMic = e.target.closest('[data-ibx-mic]');
    if (ibxMic) { startMicInto(document.getElementById('inboxPageText'), ibxMic); return; }

    var ibxAdd = e.target.closest('[data-ibx-add]');
    if (ibxAdd) {
      var field = document.getElementById('inboxPageText');
      var txt = field.value.trim();
      if (!txt) { toast('Напиши хоть пару слов'); return; }
      inboxAdd(txt);
      field.value = '';
      renderInboxCard();
      inboxRender();
      toast('В ящике. Голову можно освободить 🐧');
      return;
    }

    var ibd = e.target.closest('[data-ibx-del]');
    if (ibd) {
      inboxDel(ibd.dataset.ibxDel);
      renderInboxCard();
      inboxRender();
      return;
    }

    var el = e.target.closest('[data-act],[data-rm],[data-split]');
    if (!el) return;

    if (el.dataset.rm) {
      routine.tasks = routine.tasks.filter(function (x) { return x.id !== el.dataset.rm; });
      rSave();
      renderTasks();
      return;
    }
    if (el.dataset.split) {
      var task2 = findTask(el.dataset.split);
      if (!task2) return;
      var s = prompt('Первый шаг — такой, чтобы занял максимум 2 минуты.\nНесколько шагов можно через точку с запятой:', '');
      if (!s || !s.trim()) return;
      task2.steps = task2.steps || [];
      var arr = s.split(';');
      for (var a = 0; a < arr.length; a++) {
        if (arr[a].trim()) task2.steps.push({ text: arr[a].trim(), done: false });
      }
      rSave();
      renderTasks();
      return;
    }

    switch (el.dataset.act) {
      case 'addtask': renderTaskForm(); break;
      case 'canceltask': document.getElementById('taskForm').innerHTML = ''; break;
      case 'savetask':
        var ttl = document.getElementById('tTitle').value.trim();
        if (!ttl) { toast('Напиши хотя бы пару слов'); return; }
        var picked = document.querySelector('#estChips [aria-pressed="true"]');
        routine.tasks.push({
          id: uid(), title: ttl,
          time: document.getElementById('tTime').value || '',
          est: picked ? parseInt(picked.dataset.est, 10) : 0,
          fact: 0, done: false, steps: []
        });
        rSave();
        document.getElementById('taskForm').innerHTML = '';
        renderTasks();
        toast('Добавлено. Шаги добавляются кнопкой со стрелкой');
        break;
      case 'uncheck':
        for (var k = 0; k < routine.tasks.length; k++) {
          routine.tasks[k].done = false;
          var sts = routine.tasks[k].steps || [];
          for (var m = 0; m < sts.length; m++) sts[m].done = false;
        }
        askFactFor = '';
        rSave();
        renderTasks();
        break;
      case 'showall': showAllTasks = true; renderTasks(); break;
      case 'showless': showAllTasks = false; renderTasks(); break;
      case 'treset': tReset('focus'); break;
      case 'rung-ok':
        ladder.step = 0;
        ladderPickAll();
        renderLadder();
        praise();
        break;
      case 'rung-other':
        var cur = LADDER[ladder.step];
        if (cur.items.length > 1) {
          var nx;
          do { nx = Math.floor(Math.random() * cur.items.length); } while (nx === ladder.pick[ladder.step]);
          ladder.pick[ladder.step] = nx;
        }
        renderLadder();
        break;
      case 'rung-next':
        ladder.step = Math.min(LADDER.length - 1, ladder.step + 1);
        renderLadder();
        break;
      case 'rung-timer':
        setTimerCfg('focus', 2);
        tReset('focus');
        tToggle();
        document.querySelector('.timer').scrollIntoView({ block: 'center' });
        break;
      case 'rung-stop':
        ladder.step = 0;
        ladderPickAll();
        renderLadder();
        toast('Не идёт — так бывает. Завтра ступени будут те же');
        break;
      case 'addrem': addReminder(); break;
      case 'remperm': askNotifyPermission(); break;
    }
  });
}

document.addEventListener('DOMContentLoaded', rInit);
