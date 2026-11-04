/* Логика анкеты. Один вопрос на экран — так меньше перегрузки.
   Шаги: 0 — о себе, 1..N — вопросы, N+1 — вопрос безопасности, N+2 — результат.
   Результат — направления, а не диагнозы. */

var qState = { i: 0, answers: [], safety: null };
var qRoot;

function qTotal() { return QUESTIONS.length + 2; } // «о себе» + вопросы + безопасность

function qRender() {
  if (qState.i === 0) return qRenderProfile();
  if (qState.i <= QUESTIONS.length) return qRenderQuestion(qState.i - 1);
  if (qState.i === QUESTIONS.length + 1) return qRenderSafety();
  return qRenderResult();
}

function qProgress(step) {
  var pct = Math.round(step / qTotal() * 100);
  return '<div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
         '<i style="width:' + pct + '%"></i></div>' +
         '<p class="muted">Шаг ' + (step + 1) + ' из ' + qTotal() + '</p>';
}

/* ---------- Шаг 0: о себе ---------- */
function qRenderProfile() {
  var p = getProfile();
  var html = qProgress(0) + '<div class="card"><h1 style="font-size:1.35rem">Пара слов о тебе</h1>' +
    '<p class="muted">Оба вопроса можно пропустить. Возраст нужен, чтобы подсказать, что доступно ' +
    'именно тебе — подростку и взрослому помогают по-разному. Данные никуда не уходят.</p>';

  html += '<h3 style="margin-top:18px">Сколько тебе лет</h3><div class="opts">';
  for (var i = 0; i < AGES.length; i++) {
    var onA = p.age === AGES[i].v ? ' on' : '';
    html += '<label class="opt' + onA + '"><input type="radio" name="age" value="' + AGES[i].v + '"' +
            (p.age === AGES[i].v ? ' checked' : '') + '><span>' + esc(AGES[i].label) + '</span></label>';
  }
  html += '</div>';

  html += '<h3 style="margin-top:18px">Как к тебе обращаться</h3>' +
    '<p class="muted" style="margin-top:-4px">Это только про окончания в словах: «ты сделал» или «ты сделала».</p>' +
    '<div class="opts">';
  for (var j = 0; j < GENDERS.length; j++) {
    var onG = p.gender === GENDERS[j].v ? ' on' : '';
    html += '<label class="opt' + onG + '"><input type="radio" name="gender" value="' + GENDERS[j].v + '"' +
            (p.gender === GENDERS[j].v ? ' checked' : '') + '><span>' + esc(GENDERS[j].label) + '</span></label>';
  }
  html += '</div><div class="btn-row" style="margin-top:16px">' +
          '<button class="btn" data-act="next">Начать ' + icon('right') + '</button></div>' +
          '<p class="muted" style="margin:12px 0 0">Поменять можно в любой момент, пройдя анкету заново.</p></div>';
  qRoot.innerHTML = html;
}

/* ---------- Вопросы ---------- */
function qRenderQuestion(n) {
  var q = QUESTIONS[n];
  var chosen = qState.answers[n];
  var html = qProgress(qState.i) + '<div class="card"><h1 style="font-size:1.35rem">' + esc(q.q) + '</h1>' +
             '<div class="opts" id="opts">';
  for (var i = 0; i < SCALE.length; i++) {
    var on = chosen === SCALE[i].v ? ' on' : '';
    html += '<label class="opt' + on + '"><input type="radio" name="a" value="' + SCALE[i].v + '"' +
            (chosen === SCALE[i].v ? ' checked' : '') + '><span>' + esc(SCALE[i].label) + '</span></label>';
  }
  html += '</div><div class="btn-row" style="margin-top:16px">' +
          '<button class="btn ghost" data-act="back">' + icon('left') + ' Назад</button>' +
          '<button class="btn" data-act="next"' + (chosen === undefined ? ' disabled' : '') + '>Дальше ' +
          icon('right') + '</button>' +
          '</div><p class="muted" style="margin:12px 0 0">Отвечай про последние две недели. ' +
          'С клавиатуры: 1–4 — ответ, стрелки ← → — шаг назад и вперёд.</p></div>';
  qRoot.innerHTML = html;
}

function qRenderSafety() {
  var html = qProgress(qState.i) +
    '<div class="card"><h1 style="font-size:1.35rem">' + esc(SAFETY.q) + '</h1>' +
    '<p class="muted">Этот вопрос ни на что не «записывает». Он нужен только для того, чтобы показать тебе ' +
    'нужные контакты, если они пригодятся.</p><div class="opts" id="opts">';
  for (var i = 0; i < SAFETY.opts.length; i++) {
    var on = qState.safety === SAFETY.opts[i].v ? ' on' : '';
    html += '<label class="opt' + on + '"><input type="radio" name="s" value="' + SAFETY.opts[i].v + '"' +
            (qState.safety === SAFETY.opts[i].v ? ' checked' : '') + '><span>' + esc(SAFETY.opts[i].label) + '</span></label>';
  }
  html += '</div><div class="btn-row" style="margin-top:16px">' +
          '<button class="btn ghost" data-act="back">' + icon('left') + ' Назад</button>' +
          '<button class="btn" data-act="next"' + (qState.safety === null ? ' disabled' : '') +
          '>Показать результат ' + icon('right') + '</button>' +
          '</div></div>';
  qRoot.innerHTML = html;
}

/* ---------- Подсчёт ---------- */
function qScore() {
  var sum = {}, max = {};
  for (var i = 0; i < QUESTIONS.length; i++) {
    var d = QUESTIONS[i].d;
    sum[d] = (sum[d] || 0) + (qState.answers[i] || 0);
    max[d] = (max[d] || 0) + 3;
  }
  var list = [];
  for (var key in sum) {
    if (!DOMAINS[key]) continue;
    list.push({ id: key, pct: Math.round(sum[key] / max[key] * 100) });
  }
  list.sort(function (a, b) { return b.pct - a.pct; });
  return list;
}

/* ---------- Результат ---------- */
function qRenderResult() {
  var list = qScore();
  // Главные направления: всё от 45%, но не меньше двух и не больше четырёх.
  var top = list.filter(function (x) { return x.pct >= 45; });
  if (top.length < 2) top = list.slice(0, 2);
  if (top.length > 4) top = top.slice(0, 4);
  var topIds = top.map(function (x) { return x.id; });
  var rest = list.filter(function (x) { return topIds.indexOf(x.id) < 0; });

  var html = '';

  if (qState.safety > 0) {
    html += '<div class="note crisis"><p><strong>Сначала самое важное.</strong> ' +
      G('Ты отметил мысли о том', 'Ты отметила мысли о том', 'В ответах есть мысли о том') +
      ', что не хочется жить, или о причинении себе вреда. С этим не надо справляться в одиночку, ' +
      'и это не «недостаточно серьёзно».</p>' +
      '<p>Позвони: <strong>112</strong> — экстренные службы, <strong>8 800 2000 122</strong> — бесплатно, круглосуточно, ' +
      'анонимно, <strong>+7 495 989 50 50</strong> — психологи МЧС. ' +
      'Если есть риск прямо сейчас — лучше остаться рядом с кем-то, кому доверяешь.</p>' +
      '<p>Пожалуйста, прочитай это до остального результата. <a href="resources.html#crisis">Все контакты</a>.</p></div>';
  }

  html += '<div class="hero" style="padding-top:0">' + mascotHTML('penguin', 150, 'Пингвин Хагси') +
    '<h1>Готово. ' + G('Спасибо, что ответил честно', 'Спасибо, что ответила честно', 'Спасибо за честность') + '</h1>' +
    '<p class="lead">Это не диагноз. Это направления, с которых разумнее всего начать именно тебе сейчас.</p></div>';

  for (var i = 0; i < top.length; i++) {
    var d = DOMAINS[top[i].id];
    html += '<div class="card"><h2>' + iconOr(d.icon) + esc(d.title) +
      ' <span class="pill hot">' + top[i].pct + '%</span></h2>' +
      '<p>' + esc(d.about) + '</p><h3>Что помогает</h3><ul>';
    for (var j = 0; j < d.help.length; j++) html += '<li>' + esc(d.help[j]) + '</li>';
    html += '</ul><div class="btn-row">';
    for (var k = 0; k < d.tools.length; k++) {
      html += '<a class="btn sm" href="' + d.tools[k].href + '">' + esc(d.tools[k].label) + '</a>';
    }
    html += '<a class="btn sm ghost" href="resources.html#' + d.res + '">Куда обратиться</a></div></div>';
  }

  // Подсказка под возраст: подростку и взрослому доступны разные вещи
  var tip = AGE_TIPS[getProfile().age];
  if (tip) {
    html += '<div class="note ok"><p><strong>' + esc(tip.title) + '</strong></p><ul style="margin:0">';
    for (var t = 0; t < tip.items.length; t++) html += '<li>' + esc(tip.items[t]) + '</li>';
    html += '</ul></div>';
  }

  if (rest.length) {
    html += '<div class="card soft"><h3>Остальное — пока в фоне</h3><p class="muted">Здесь ответы спокойнее. ' +
      'Если что-то из этого всё равно беспокоит — доверяй себе, а не проценту.</p>';
    for (var r = 0; r < rest.length; r++) {
      var rd = DOMAINS[rest[r].id];
      html += '<p style="margin-bottom:6px">' + iconOr(rd.icon) + ' ' + esc(rd.title) +
        ' — ' + rest[r].pct + '%</p><div class="bar" style="margin-bottom:12px"><i style="width:' + rest[r].pct + '%"></i></div>';
    }
    html += '</div>';
  }

  html += '<div class="btn-row"><button class="btn ghost" data-act="again">Пройти заново</button>' +
    '<a class="btn ghost" href="tracker.html">Открыть дневник</a></div>' +
    '<p class="muted">Результат сохранён только у тебя в браузере. Можно вернуться к нему с главной страницы.</p>';

  qRoot.innerHTML = html;

  Store.set('quiz.last', { date: nowLocal(), top: top, safety: qState.safety });
}

/* ---------- События ---------- */
function qInit() {
  qRoot = document.getElementById('quizRoot');
  if (!qRoot) return;

  qRoot.addEventListener('change', function (e) {
    var inp = e.target;
    if (inp.name === 'a') qState.answers[qState.i - 1] = parseInt(inp.value, 10);
    else if (inp.name === 's') qState.safety = parseInt(inp.value, 10);
    else if (inp.name === 'age' || inp.name === 'gender') {
      var p = getProfile();
      p[inp.name] = inp.value;
      setProfile(p);
    } else return;

    // Подсветить выбранный вариант, не перерисовывая весь экран
    var group = inp.closest('.opts');
    if (group) {
      var opts = group.querySelectorAll('.opt');
      for (var i = 0; i < opts.length; i++) opts[i].classList.toggle('on', opts[i].contains(inp));
    }
    var next = qRoot.querySelector('[data-act="next"]');
    if (next) next.disabled = false;
  });

  qRoot.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act;
    if (act === 'next') qState.i++;
    else if (act === 'back') qState.i--;
    else if (act === 'again') qState = { i: 0, answers: [], safety: null };
    else return;
    qRender();
    window.scrollTo(0, 0);
  });

  // Клавиатура: 1–4 — ответ, стрелки — перемещение по шагам
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var btn = qRoot.querySelector('[data-act="' + (e.key === 'ArrowLeft' ? 'back' : 'next') + '"]');
      if (btn && !btn.disabled) {
        e.preventDefault();
        btn.click();
      }
      return;
    }

    if (qState.i < 1 || qState.i > QUESTIONS.length + 1) return;
    var n = parseInt(e.key, 10);
    if (!n) return;
    var inputs = qRoot.querySelectorAll('.opt input');
    if (n >= 1 && n <= inputs.length) {
      inputs[n - 1].checked = true;
      inputs[n - 1].dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  qRender();
}

document.addEventListener('DOMContentLoaded', qInit);
