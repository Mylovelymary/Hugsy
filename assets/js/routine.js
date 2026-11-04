/* Рутина дня: чеклист, дробление задач, таймер фокуса.
   Тон: никогда не укоряем за пропуски. Серия не обнуляется. */

var routine = { date: '', tasks: [] };
var tcfg = { focus: 20, brk: 5 };
var timer = { left: 0, run: false, mode: 'focus', iv: null };

var NUDGES = [
  'Поставь таймер на 2 минуты и делай. Через 2 минуты можно честно бросить.',
  'Сделай только первый физический шаг: открой файл, достань вещь, открой дверь.',
  'Скажи вслух, что именно ты собираешься сделать. Одно предложение.',
  'Налей воды и вернись. Иногда запуск тормозит просто из-за тела.',
  'Разреши себе сделать это плохо. Плохо сделанное можно поправить, несделанное — нет.',
  'Убери с глаз всё, кроме одной задачи. Выбор отнимает больше сил, чем работа.',
  'Начни с середины, если начало тяжёлое. Порядок не обязателен.',
  'Поставь задачу на 1 минуту меньше, чем кажется возможным, и останови себя по звонку.'
];

/* ---------- Данные ---------- */
function rLoad() {
  routine = Store.get('routine', null) || { date: todayKey(), tasks: [] };
  tcfg = Store.get('timer.cfg', null) || { focus: 20, brk: 5 };
  if (routine.date !== todayKey()) {
    // Новый день: задачи оставляем, галочки снимаем. Без упрёков.
    for (var i = 0; i < routine.tasks.length; i++) {
      routine.tasks[i].done = false;
      var st = routine.tasks[i].steps || [];
      for (var j = 0; j < st.length; j++) st[j].done = false;
    }
    routine.date = todayKey();
    rSave();
    document.getElementById('dayNote').textContent =
      'Новый день — галочки сняты, задачи остались. Начать можно с любой.';
  }
}
function rSave() { Store.set('routine', routine); }

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

/* ---------- Задачи ---------- */
function renderTasks() {
  var host = document.getElementById('tasks');
  if (!routine.tasks.length) {
    host.innerHTML = '<div class="empty">' + mascotHTML('goose', 96, '') +
      '<p>На сегодня пусто. Добавь одну задачу — не самую важную, а самую маленькую.</p></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < routine.tasks.length; i++) {
    var t = routine.tasks[i];
    html += '<div class="task' + (t.done ? ' done' : '') + '">' +
      '<input type="checkbox" data-done="' + t.id + '"' + (t.done ? ' checked' : '') +
      ' aria-label="Выполнено: ' + esc(t.title) + '">' +
      '<div class="body"><div class="ttl">' + esc(t.title) + '</div>' +
      (t.time ? '<div class="meta">' + icon('clock') + ' ' + esc(t.time) + '</div>' : '');
    if (t.steps && t.steps.length) {
      html += '<ul class="steps">';
      for (var j = 0; j < t.steps.length; j++) {
        html += '<li><label style="cursor:pointer"><input type="checkbox" style="width:16px;height:16px;margin-right:6px"' +
          ' data-step="' + t.id + ':' + j + '"' + (t.steps[j].done ? ' checked' : '') + '>' +
          (t.steps[j].done ? '<s>' + esc(t.steps[j].text) + '</s>' : esc(t.steps[j].text)) + '</label></li>';
      }
      html += '</ul>';
    }
    html += '</div><div style="white-space:nowrap">' +
      '<button class="btn sm ghost ico-only" data-split="' + t.id + '" title="Разбить на шаги" ' +
      'aria-label="Разбить на шаги">' + icon('steps') + '</button> ' +
      '<button class="btn sm ghost ico-only" data-rm="' + t.id + '" aria-label="Удалить задачу">' +
      icon('close') + '</button></div></div>';
  }
  var doneN = routine.tasks.filter(function (x) { return x.done; }).length;
  html += '<p class="muted">Сделано: ' + doneN + ' из ' + routine.tasks.length + '.' +
    (doneN ? ' Этого уже достаточно, чтобы день считался не зря.' : '') + '</p>';
  host.innerHTML = html;
}

function renderTaskForm() {
  document.getElementById('taskForm').innerHTML =
    '<div class="card soft" style="margin-top:14px" id="tf">' +
    '<label class="f"><span>Что нужно сделать</span><input type="text" id="tTitle" placeholder="Например: разобрать один ящик"></label>' +
    '<label class="f"><span>Во сколько (необязательно)</span><input type="time" id="tTime"></label>' +
    '<div class="btn-row"><button class="btn" data-act="savetask">Добавить</button>' +
    '<button class="btn ghost" data-act="canceltask">Отмена</button></div></div>';
  document.getElementById('tTitle').focus();
}

function findTask(id) {
  for (var i = 0; i < routine.tasks.length; i++) if (routine.tasks[i].id === id) return routine.tasks[i];
  return null;
}

/* ---------- Таймер ---------- */
function fmtClock(sec) {
  return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
}
var FOCUS_PRESETS = [7, 15, 20, 25, 45];
var BRK_PRESETS = [3, 5, 10];

/* Кнопки «−» и «+» и готовые значения вместо поля со стрелочками:
   по ним реально попасть пальцем, и не надо ничего печатать. */
function renderTimerControls() {
  document.getElementById('focusVal').textContent = tcfg.focus;
  document.getElementById('brkVal').textContent = tcfg.brk;

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
      btns[k].innerHTML = icon(btns[k].dataset.step.indexOf('-') > 0 ? 'minus' : 'plus');
    }
  }
  document.querySelector('[data-step="focus:-5"]').disabled = tcfg.focus <= 1;
  document.querySelector('[data-step="focus:5"]').disabled = tcfg.focus >= 90;
  document.querySelector('[data-step="brk:-1"]').disabled = tcfg.brk <= 1;
  document.querySelector('[data-step="brk:1"]').disabled = tcfg.brk >= 30;
}

function setTimerCfg(key, value) {
  if (key === 'focus') tcfg.focus = Math.max(1, Math.min(90, value));
  else tcfg.brk = Math.max(1, Math.min(30, value));
  Store.set('timer.cfg', tcfg);
  renderTimerControls();
  if (!timer.run) tReset(timer.mode);
}

function tRender() {
  document.getElementById('clock').textContent = fmtClock(timer.left);
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
      notify(wasFocus ? 'Отрезок фокуса закончен. Пингвин доволен 🐧' : 'Перерыв закончен. Можно ещё один отрезок.');
      tReset(wasFocus ? 'break' : 'focus');
      return;
    }
    document.getElementById('clock').textContent = fmtClock(timer.left);
  }, 1000);
}
function notify(msg) {
  toast(msg);
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Hugsy', { body: msg });
    }
  } catch (e) {}
}

/* ---------- Старт ---------- */
function rInit() {
  rLoad();
  renderTasks();
  markVisit();
  mountIcons();

  renderTimerControls();
  tReset('focus');
  newNudge();

  document.getElementById('tstart').addEventListener('click', function () {
    // Разрешение на уведомления спрашиваем только по явному действию пользователя
    try {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    } catch (e) {}
    tToggle();
  });

  document.body.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.done) {
      var t = findTask(el.dataset.done);
      if (t) {
        t.done = el.checked;
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
    if (el.dataset.step) {
      var parts = el.dataset.step.split(':');
      var task = findTask(parts[0]);
      if (task && task.steps[parts[1]]) {
        task.steps[parts[1]].done = el.checked;
        rSave();
        renderTasks();
      }
    }
  });

  document.body.addEventListener('click', function (e) {
    var st = e.target.closest('[data-step]');
    if (st) {
      var ps = st.dataset.step.split(':');
      setTimerCfg(ps[0], (ps[0] === 'focus' ? tcfg.focus : tcfg.brk) + parseInt(ps[1], 10));
      return;
    }
    var pr = e.target.closest('[data-preset]');
    if (pr) {
      var pp = pr.dataset.preset.split(':');
      setTimerCfg(pp[0], parseInt(pp[1], 10));
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
      var task = findTask(el.dataset.split);
      if (!task) return;
      var s = prompt('Первый шаг — такой, чтобы занял максимум 2 минуты.\nНесколько шагов можно через точку с запятой:', '');
      if (!s || !s.trim()) return;
      task.steps = task.steps || [];
      var arr = s.split(';');
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].trim()) task.steps.push({ text: arr[i].trim(), done: false });
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
        routine.tasks.push({
          id: uid(), title: ttl,
          time: document.getElementById('tTime').value || '',
          done: false, steps: []
        });
        rSave();
        document.getElementById('taskForm').innerHTML = '';
        renderTasks();
        toast('Добавлено. Шаги добавляются кнопкой со стрелкой');
        break;
      case 'uncheck':
        for (var k = 0; k < routine.tasks.length; k++) {
          routine.tasks[k].done = false;
          var st = routine.tasks[k].steps || [];
          for (var m = 0; m < st.length; m++) st[m].done = false;
        }
        rSave();
        renderTasks();
        break;
      case 'treset': tReset('focus'); break;
      case 'nudge': newNudge(); break;
    }
  });
}

function newNudge() {
  var el = document.getElementById('nudge');
  var next, cur = el.textContent;
  do { next = NUDGES[Math.floor(Math.random() * NUDGES.length)]; } while (next === cur && NUDGES.length > 1);
  el.textContent = next;
}

document.addEventListener('DOMContentLoaded', rInit);
