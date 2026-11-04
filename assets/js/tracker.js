/* Таблицы: дневник чувств и любые свои таблицы.
   Данные: Store['tables'] = [ {id,name,icon,cols:[{id,name,type,list,hint}],rows:[{id,ts,c:{colId:val}}]} ] */

var tables = [];
var curId = null;
var editingRow = null;
var colDraft = null; // черновик колонок при создании/настройке таблицы

/* ---------- Данные ---------- */

/* Раньше иконки таблиц хранились эмодзи. Переводим на имена из набора иконок,
   чтобы у тех, кто уже пользовался сайтом, вид не отличался. */
var ICON_MIGRATION = {
  '\uD83D\uDCD4': 'notebook', '\uD83C\uDF24\uFE0F': 'sun', '\uD83C\uDF19': 'moon',
  '\uD83C\uDFA7': 'headphones', '\uD83C\uDF31': 'sprout', '\u2728': 'sparkles',
  '\uD83D\uDCC4': 'notebook'
};
/* Дневник чувств переехал на колонки дата / ситуация / мысль / эмоция / реакция.
   Старые таблицы переименовываем и переносим данные: «Когда» → «Дата»,
   «Чувство» → «Эмоция». «Сила» и «Что помогло» убираем — записи в них не теряются,
   они просто перестают показываться (данные лежат в строках по id колонки). */
var COL_RENAME = { 'Когда': 'Дата', 'Чувство': 'Эмоция' };
var DROP_COLS = ['Сила', 'Что помогло'];

function migrateFeelings() {
  var changed = false;
  for (var i = 0; i < tables.length; i++) {
    var t = tables[i];
    if (t.name !== 'Дневник чувств') continue;
    var cols = [];
    for (var c = 0; c < t.cols.length; c++) {
      var col = t.cols[c];
      if (DROP_COLS.indexOf(col.name) >= 0) { changed = true; continue; }
      if (COL_RENAME[col.name]) { col.name = COL_RENAME[col.name]; changed = true; }
      cols.push(col);
    }
    // порядок: дата, ситуация, мысль, эмоция, реакция
    var order = ['Дата', 'Ситуация', 'Мысль', 'Эмоция', 'Реакция'];
    cols.sort(function (a, b) {
      var ia = order.indexOf(a.name), ib = order.indexOf(b.name);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    var hasReaction = cols.some(function (x) { return x.name === 'Реакция'; });
    if (!hasReaction) {
      cols.push({ id: uid(), name: 'Реакция', type: 'long',
                  hint: 'Что ты сделал или что произошло в теле', list: '' });
      changed = true;
    }
    t.cols = cols;
  }
  if (changed) tSave();
}

function migrateIcons() {
  var changed = false;
  for (var i = 0; i < tables.length; i++) {
    var m = ICON_MIGRATION[tables[i].icon];
    if (m) { tables[i].icon = m; changed = true; }
  }
  if (changed) tSave();
}

function tLoad() {
  tables = Store.get('tables', null);
  if (!tables || !tables.length) {
    tables = [tFromTemplate(TEMPLATES[0])];
    tSave();
  }
  migrateIcons();
  migrateFeelings();
  curId = Store.get('tables.cur', tables[0].id);
  if (!tFind(curId)) curId = tables[0].id;
}
function tSave() {
  Store.set('tables', tables);
  Store.set('tables.cur', curId);
}
function tFind(id) {
  for (var i = 0; i < tables.length; i++) if (tables[i].id === id) return tables[i];
  return null;
}
function tFromTemplate(tpl, name) {
  var cols = [];
  for (var i = 0; i < tpl.cols.length; i++) {
    var c = tpl.cols[i];
    cols.push({ id: uid(), name: c.name, type: c.type, list: c.list || '', hint: c.hint || '' });
  }
  return { id: uid(), name: name || tpl.name, icon: tpl.icon, cols: cols, rows: [] };
}

/* ---------- Вкладки ---------- */
function renderTabs() {
  var html = '';
  for (var i = 0; i < tables.length; i++) {
    var t = tables[i];
    html += '<button role="tab" data-tab="' + t.id + '" aria-selected="' + (t.id === curId) + '">' +
            (iconOr(t.icon) || icon('notebook')) + ' ' + esc(t.name) + '</button>';
  }
  html += '<button data-act="new" title="Новая таблица">' + icon('plus') + ' Новая таблица</button>';
  document.getElementById('tabs').innerHTML = html;
}

/* ---------- Значения ---------- */
function moodLabel(v) {
  for (var i = 0; i < MOODS.length; i++) if (String(MOODS[i].v) === String(v)) return MOODS[i].label;
  return '';
}
function moodIcon(v) {
  for (var i = 0; i < MOODS.length; i++) if (String(MOODS[i].v) === String(v)) return icon(MOODS[i].icon);
  return '';
}

function cellText(col, val) {
  if (val === undefined || val === null || val === '') return '—';
  if (col.type === 'mood') return moodLabel(val) || '—';
  if (col.type === 'scale') return val + '/10';
  if (col.type === 'date') {
    var p = String(val).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : val;
  }
  return String(val);
}

/* ---------- Быстрая отметка настроения в два касания ----------
   Самый важный сценарий: когда тяжело, писать текст непосильно,
   а ткнуть в лицо — посильно. Поэтому текст здесь нигде не обязателен. */

var quickSel = { mood: null, acts: [] };

function colOfType(t, type) {
  for (var i = 0; i < t.cols.length; i++) if (t.cols[i].type === type) return t.cols[i];
  return null;
}

/* Таблица с колонкой-настроением: берём первую существующую, иначе создаём из шаблона */
function getMoodTable(create) {
  for (var i = 0; i < tables.length; i++) {
    if (colOfType(tables[i], 'mood')) return tables[i];
  }
  if (!create) return null;
  var tpl = null;
  for (var j = 0; j < TEMPLATES.length; j++) if (TEMPLATES[j].id === 'mood') tpl = TEMPLATES[j];
  if (!tpl) return null;
  var t = tFromTemplate(tpl);
  tables.push(t);
  tSave();
  renderTabs();
  return t;
}

function todayMoods(t) {
  if (!t) return [];
  var dc = colOfType(t, 'date'), mc = colOfType(t, 'mood');
  if (!dc || !mc) return [];
  var today = todayISO(), out = [];
  for (var i = 0; i < t.rows.length; i++) {
    if (t.rows[i].c[dc.id] === today && t.rows[i].c[mc.id]) out.push(t.rows[i].c[mc.id]);
  }
  return out;
}

/* Дни недели, в которые есть хоть одна запись в любой таблице */
function filledDays() {
  var set = {};
  for (var i = 0; i < tables.length; i++) {
    var dc = colOfType(tables[i], 'date');
    for (var r = 0; r < tables[i].rows.length; r++) {
      var row = tables[i].rows[r];
      if (dc && row.c[dc.id]) set[row.c[dc.id]] = true;
      else if (row.ts) {
        var d = new Date(row.ts);
        set[d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())] = true;
      }
    }
  }
  return set;
}

function renderQuick() {
  var host = document.getElementById('quick');
  if (!host) return;
  var done = todayMoods(getMoodTable(false));

  var html = '<div class="card">' + weekStripHTML(filledDays(), false) +
    '<hr class="sep" style="margin:18px 0">' +
    '<h2>' + icon('sun') + 'Как ты сейчас?</h2>' +
    '<p class="muted">Два касания — и запись готова. Писать ничего не нужно.</p><div class="moods">';
  for (var i = 0; i < MOODS.length; i++) {
    html += '<button type="button" class="mood" data-mood="' + MOODS[i].v + '" aria-pressed="' +
            (quickSel.mood === MOODS[i].v) + '">' + icon(MOODS[i].icon) +
            '<span>' + esc(MOODS[i].label) + '</span></button>';
  }
  html += '</div>';

  if (quickSel.mood !== null) {
    html += '<h3 style="margin:18px 0 8px">Что было? <span class="muted" style="font-weight:400">— можно пропустить</span></h3>' +
            '<div class="chips">';
    for (var a = 0; a < ACTIVITIES.length; a++) {
      html += '<button type="button" class="chip" data-chip="' + esc(ACTIVITIES[a]) + '" aria-pressed="' +
              (quickSel.acts.indexOf(ACTIVITIES[a]) >= 0) + '">' + esc(ACTIVITIES[a]) + '</button>';
    }
    html += '</div><div class="btn-row" style="margin-top:16px">' +
            '<button class="btn" data-act="quicksave">' + icon('check') + ' Сохранить</button>' +
            '<button class="btn ghost" data-act="quickmore">Добавить подробности</button>' +
            '<button class="btn ghost" data-act="quickcancel">Отмена</button></div>';
  }

  if (done.length) {
    html += '<p class="muted" style="margin:14px 0 0">Сегодня уже отмечено: ' +
            esc(done.map(moodLabel).join(', ')) + '. Можно отметить ещё раз — настроение меняется, это нормально.</p>';
  }
  html += '</div>';
  host.innerHTML = html;
}

function quickSave(openDetails) {
  var t = getMoodTable(true);
  if (!t) { toast('Не получилось создать таблицу'); return; }
  var dc = colOfType(t, 'date'), mc = colOfType(t, 'mood');
  var cells = {};
  if (dc) cells[dc.id] = todayISO();
  if (mc) cells[mc.id] = quickSel.mood;
  // «Что было» — первая текстовая колонка
  for (var i = 0; i < t.cols.length; i++) {
    if (t.cols[i].type === 'text') { cells[t.cols[i].id] = quickSel.acts.join(', '); break; }
  }
  var row = { id: uid(), ts: Date.now(), c: cells };
  t.rows.push(row);
  curId = t.id;
  tSave();
  quickSel = { mood: null, acts: [] };

  renderTabs();
  renderPanel();
  renderQuick();

  if (openDetails) {
    renderForm(row);
    document.getElementById('rowForm').scrollIntoView({ block: 'center' });
  } else {
    praise();
  }
}

/* ---------- Главная панель ---------- */
function renderPanel() {
  var t = tFind(curId);
  var p = document.getElementById('panel');
  if (!t) { p.innerHTML = ''; return; }

  var html = '<div class="card"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
    '<h2 style="margin:0;flex:1 1 auto">' + (iconOr(t.icon) || icon('notebook')) + esc(t.name) + '</h2>' +
    '<button class="btn sm" data-act="addrow">' + icon('plus') + ' Запись</button>' +
    '<button class="btn sm ghost" data-act="cfg">' + icon('columns') + ' Колонки</button>' +
    '</div>';

  html += '<p class="muted" style="margin:8px 0 0">' + t.rows.length + ' ' + plural(t.rows.length, 'запись', 'записи', 'записей') +
    (t.rows.length ? ' · за последние 7 дней: ' + recentCount(t) : '') + '</p>';
  html += '<div id="formHost"></div>';

  if (!t.rows.length) {
    html += '<div class="empty">' + mascotHTML('penguin', 92, '') +
      '<p>Пока пусто. Первая запись — самая трудная, дальше проще.</p>' +
      '<button class="btn" data-act="addrow">Сделать первую запись</button></div>';
  } else {
    // tbl-rows: на узком экране таблица остаётся таблицей, но ячейки режутся
    // до трёх строк, а вся запись открывается в окне по нажатию на строку
    html += '<div class="tbl-wrap tbl-rows"><table class="data"><thead><tr>';
    for (var i = 0; i < t.cols.length; i++) html += '<th>' + esc(t.cols[i].name) + '</th>';
    html += '<th class="act"></th></tr></thead><tbody>';
    for (var r = t.rows.length - 1; r >= 0; r--) { // новые сверху
      var row = t.rows[r];
      html += '<tr data-row="' + row.id + '">';
      for (var c = 0; c < t.cols.length; c++) {
        html += '<td data-label="' + esc(t.cols[c].name) + '"><div class="clamp">' +
          esc(cellText(t.cols[c], row.c[t.cols[c].id])) + '</div></td>';
      }
      html += '<td class="act"><button class="row-ic" data-edit="' + row.id + '" title="Изменить" ' +
              'aria-label="Изменить запись">' + icon('pencil') + '</button>' +
              '<button class="row-ic danger" data-del="' + row.id +
              '" title="Удалить" aria-label="Удалить запись">' + icon('trash') + '</button></td></tr>';
    }
    html += '</tbody></table></div>';
  }
  html += '</div>';

  html += '<div class="card soft"><h3>' + icon('download') + 'Выгрузить и поделиться</h3>' +
    '<div class="btn-row">' +
    '<button class="btn sm ghost" data-act="csv">' + icon('download') + ' Таблица для Excel (CSV)</button>' +
    '<button class="btn sm ghost" data-act="copy">' + icon('copy') + ' Скопировать текстом</button>' +
    '<button class="btn sm ghost" data-act="print">' + icon('printer') + ' Распечатать</button>' +
    '<button class="btn sm ghost" data-act="backup">' + icon('download') + ' Резервная копия всего</button>' +
    '<button class="btn sm ghost" data-act="restore">' + icon('upload') + ' Восстановить из копии</button>' +
    '</div><p class="muted" style="margin:10px 0 0">CSV открывается в Excel и Google Таблицах — удобно показать специалисту. ' +
    'Резервная копия — файл со всеми таблицами: пригодится при смене браузера или чистке истории.</p></div>';

  html += '<div class="card"><h3>' + icon('sliders') + 'Настройки таблицы</h3><div class="btn-row">' +
    '<button class="btn sm ghost" data-act="rename">' + icon('pencil') + ' Переименовать</button>' +
    '<button class="btn sm danger" data-act="droptable">' + icon('trash') + ' Удалить таблицу</button>' +
    '</div></div>';

  p.innerHTML = html;
  fillEmotions();
  initClamps();
}

/* ---------- Запись целиком в окне ----------
   На телефоне ячейка режется до трёх строк — длинную запись иначе не показать,
   не заставляя таскать таблицу вбок. Нажатие на строку открывает её целиком,
   оттуда же можно изменить или удалить. */
function openRow(rowId) {
  var t = tFind(curId);
  if (!t) return;
  var row = null;
  for (var i = 0; i < t.rows.length; i++) if (t.rows[i].id === rowId) row = t.rows[i];
  if (!row) return;

  var html = '<div class="modal-back" id="rowModal"><div class="modal" role="dialog" aria-modal="true" aria-label="Запись">' +
    '<button type="button" class="inbox-x" data-act="closerow" aria-label="Закрыть">' + icon('close') + '</button>' +
    '<h3>Запись</h3>';
  for (var c = 0; c < t.cols.length; c++) {
    var val = cellText(t.cols[c], row.c[t.cols[c].id]);
    html += '<div class="modal-field"><span>' + esc(t.cols[c].name) + '</span><p>' +
      (val ? esc(val) : '—') + '</p></div>';
  }
  html += '<div class="btn-row" style="margin-top:16px">' +
    '<button class="btn sm" data-edit="' + row.id + '">' + icon('pencil') + ' Изменить</button>' +
    '<button class="btn sm ghost" data-del="' + row.id + '">' + icon('trash') + ' Удалить</button>' +
    '<button class="btn sm ghost" data-act="closerow">Закрыть</button>' +
    '</div></div></div>';

  var host = document.getElementById('dialogs');
  host.innerHTML = html;
  mountIcons(host);
}

function closeRow() {
  var m = document.getElementById('rowModal');
  if (m) m.remove();
}

/* Кнопка «…» появляется только там, где текст реально не поместился */
function initClamps() {
  var els = document.querySelectorAll('#panel .clamp');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (el.scrollHeight - el.clientHeight < 4) continue;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'more';
    b.textContent = '…';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', 'Показать текст целиком');
    el.parentNode.appendChild(b);
  }
}

function toggleClamp(btn) {
  var box = btn.parentNode.querySelector('.clamp');
  if (!box) return;
  var open = box.classList.toggle('open');
  btn.textContent = open ? 'свернуть' : '…';
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.setAttribute('aria-label', open ? 'Свернуть текст' : 'Показать текст целиком');
}

function recentCount(t) {
  var limit = Date.now() - 7 * 864e5, n = 0;
  for (var i = 0; i < t.rows.length; i++) if ((t.rows[i].ts || 0) > limit) n++;
  return n;
}
function fillEmotions() {
  var dl = document.getElementById('emotions');
  if (!dl || dl.children.length) return;
  var h = '';
  for (var i = 0; i < EMOTIONS.length; i++) h += '<option value="' + esc(EMOTIONS[i]) + '">';
  dl.innerHTML = h;
}

/* ---------- Форма записи ---------- */
function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function nowHM() {
  var d = new Date();
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

function renderForm(row) {
  var t = tFind(curId);
  editingRow = row ? row.id : null;
  var host = document.getElementById('formHost');
  var html = '<div class="card soft" style="margin:16px 0 0" id="rowForm"><h3>' +
             (row ? 'Изменить запись' : 'Новая запись') + '</h3>';
  for (var i = 0; i < t.cols.length; i++) {
    var c = t.cols[i];
    var v = row ? (row.c[c.id] === undefined ? '' : row.c[c.id]) : defaultFor(c);
    html += '<label class="f"><span>' + esc(c.name) + (c.hint ? ' — ' + esc(c.hint) : '') + '</span>';
    if (c.type === 'mood') {
      html += '<div class="moods" data-moodgroup="' + c.id + '">';
      for (var m = 0; m < MOODS.length; m++) {
        html += '<button type="button" class="mood" data-formmood="' + c.id + ':' + MOODS[m].v +
                '" aria-pressed="' + (String(v) === String(MOODS[m].v)) + '">' + icon(MOODS[m].icon) +
                '<span>' + esc(MOODS[m].label) + '</span></button>';
      }
      html += '</div><input type="hidden" data-col="' + c.id + '" value="' + esc(v) + '">';
    } else if (c.type === 'long') {
      html += '<textarea data-col="' + c.id + '">' + esc(v) + '</textarea>' + micBtn(c.id);
    } else if (c.type === 'scale') {
      html += '<div style="display:flex;align-items:center;gap:12px">' +
        '<input type="range" min="0" max="10" step="1" value="' + (v === '' ? 5 : v) + '" data-col="' + c.id + '" data-scale="1">' +
        '<output style="min-width:3ch;font-weight:700">' + (v === '' ? 5 : v) + '</output></div>';
    } else if (c.type === 'date') {
      html += '<input type="date" value="' + esc(v) + '" data-col="' + c.id + '">';
    } else if (c.type === 'time') {
      html += '<input type="time" value="' + esc(v) + '" data-col="' + c.id + '">';
    } else {
      html += '<input type="text" value="' + esc(v) + '" data-col="' + c.id + '"' +
              (c.list === 'emotions' ? ' list="emotions"' : '') + '>' + micBtn(c.id);
    }
    html += '</label>';
  }
  html += '<div class="btn-row"><button class="btn" data-act="saverow">Сохранить</button>' +
          '<button class="btn ghost" data-act="cancelrow">Отмена</button></div></div>';
  host.innerHTML = html;
  var first = host.querySelector('textarea, input[type="text"]');
  if (first) first.focus();
}

function defaultFor(c) {
  if (c.type === 'mood') return '';
  if (c.type === 'date') return todayISO();
  if (c.type === 'time') return nowHM();
  if (c.type === 'scale') return 5;
  return '';
}

/* ---------- Голосовой ввод ----------
   Сам движок общий и живёт в app.js: им пользуется ещё и ящик мыслей. */
function micBtn(colId) {
  return micBtnHTML('data-mic="' + colId + '"', 'margin-top:6px');
}
function startMic(colId, btn) {
  startMicInto(document.querySelector('[data-col="' + colId + '"]'), btn);
}

/* ---------- Редактор колонок ---------- */
function renderColEditor(mode, tpl) {
  // mode: 'new' | 'cfg'
  var host = document.getElementById('dialogs');
  var title = mode === 'new' ? 'Новая таблица' : 'Колонки таблицы';
  var nameVal = mode === 'new' ? (tpl ? tpl.name : '') : tFind(curId).name;
  var html = '<div class="card" id="colEditor"><h3>' + title + '</h3>' +
    (mode === 'new' ? '<label class="f"><span>Название таблицы</span><input type="text" id="tblName" value="' + esc(nameVal) + '"></label>' : '') +
    '<p class="muted">Колонки — это то, что ты будешь заполнять в каждой записи.</p><div id="colList"></div>' +
    '<div class="btn-row" style="margin-bottom:14px"><button class="btn sm ghost" data-act="addcol">' + icon('plus') + ' Колонка</button></div>' +
    '<div class="btn-row"><button class="btn" data-act="savecols">' + (mode === 'new' ? 'Создать таблицу' : 'Сохранить') + '</button>' +
    '<button class="btn ghost" data-act="closedlg">Отмена</button></div>' +
    '<input type="hidden" id="colMode" value="' + mode + '"></div>';
  host.innerHTML = html;
  colDraft = [];
  var src = mode === 'new' ? (tpl ? tpl.cols : [{ name: 'Дата', type: 'date' }, { name: 'Запись', type: 'long' }]) : tFind(curId).cols;
  for (var i = 0; i < src.length; i++) {
    colDraft.push({ id: src[i].id || uid(), name: src[i].name, type: src[i].type, list: src[i].list || '', hint: src[i].hint || '' });
  }
  renderColList();
  host.scrollIntoView({ block: 'start' });
}

function renderColList() {
  var html = '';
  for (var i = 0; i < colDraft.length; i++) {
    var c = colDraft[i];
    html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">' +
      '<input type="text" value="' + esc(c.name) + '" data-cname="' + i + '" aria-label="Название колонки" style="flex:2 1 120px">' +
      '<select data-ctype="' + i + '" aria-label="Тип колонки" style="flex:1 1 110px">';
    for (var j = 0; j < COL_TYPES.length; j++) {
      html += '<option value="' + COL_TYPES[j].id + '"' + (COL_TYPES[j].id === c.type ? ' selected' : '') + '>' +
              COL_TYPES[j].label + '</option>';
    }
    html += '</select><button class="row-ic danger" data-rmcol="' + i + '" title="Убрать колонку" ' +
      'aria-label="Убрать колонку">' + icon('trash') + '</button></div>';
  }
  document.getElementById('colList').innerHTML = html;
}

function renderTemplatePicker() {
  var host = document.getElementById('dialogs');
  var html = '<div class="card"><h3>С чего начнём?</h3><p class="muted">Выбери готовый шаблон — колонки можно поменять потом.</p><div class="grid">';
  for (var i = 0; i < TEMPLATES.length; i++) {
    var t = TEMPLATES[i];
    html += '<button class="tile" style="text-align:left;cursor:pointer;font:inherit" data-tpl="' + t.id + '">' +
      '<span class="ico" aria-hidden="true">' + iconOr(t.icon) + '</span><strong>' + esc(t.name) + '</strong>' +
      '<span class="d">' + esc(t.about) + '</span></button>';
  }
  html += '</div><div class="btn-row" style="margin-top:14px"><button class="btn ghost" data-act="closedlg">Отмена</button></div></div>';
  host.innerHTML = html;
  host.scrollIntoView({ block: 'start' });
}

/* ---------- Выгрузка ---------- */
function csvCell(s) {
  s = String(s == null ? '' : s);
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function exportCSV() {
  var t = tFind(curId), lines = [];
  var head = [];
  for (var i = 0; i < t.cols.length; i++) head.push(csvCell(t.cols[i].name));
  lines.push(head.join(';'));
  for (var r = 0; r < t.rows.length; r++) {
    var line = [];
    for (var c = 0; c < t.cols.length; c++) line.push(csvCell(cellText(t.cols[c], t.rows[r].c[t.cols[c].id]).replace('—', '')));
    lines.push(line.join(';'));
  }
  downloadFile(safeName(t.name) + '.csv', lines.join('\r\n'), 'text/csv');
  toast('Файл скачан');
}
function asText() {
  var t = tFind(curId), out = [t.name, ''];
  for (var r = 0; r < t.rows.length; r++) {
    for (var c = 0; c < t.cols.length; c++) {
      var v = cellText(t.cols[c], t.rows[r].c[t.cols[c].id]);
      if (v !== '—') out.push(t.cols[c].name + ': ' + v);
    }
    out.push('---');
  }
  return out.join('\n');
}
function safeName(s) {
  return String(s).replace(/[^\wА-Яа-яЁё\- ]+/g, '').trim().replace(/\s+/g, '_') || 'tablica';
}

/* ---------- События ---------- */
function tInit() {
  tLoad();
  renderTabs();
  renderQuick();
  renderPanel();

  document.getElementById('tabs').addEventListener('click', function (e) {
    var tab = e.target.closest('[data-tab]');
    if (tab) {
      curId = tab.dataset.tab;
      tSave();
      renderTabs();
      renderPanel();
      document.getElementById('dialogs').innerHTML = '';
      return;
    }
    if (e.target.closest('[data-act="new"]')) renderTemplatePicker();
  });

  document.body.addEventListener('input', function (e) {
    if (e.target.dataset.scale) {
      var out = e.target.parentNode.querySelector('output');
      if (out) out.textContent = e.target.value;
    }
  });

  document.body.addEventListener('click', function (e) {
    var more = e.target.closest('.more');
    if (more) { toggleClamp(more); return; }

    var md = e.target.closest('[data-mood]');
    if (md) {
      var val = parseInt(md.dataset.mood, 10);
      quickSel.mood = (quickSel.mood === val) ? null : val;
      renderQuick();
      return;
    }
    var ch = e.target.closest('[data-chip]');
    if (ch) {
      var name = ch.dataset.chip;
      var pos = quickSel.acts.indexOf(name);
      if (pos >= 0) quickSel.acts.splice(pos, 1); else quickSel.acts.push(name);
      ch.setAttribute('aria-pressed', pos >= 0 ? 'false' : 'true');
      return;
    }
    var fm = e.target.closest('[data-formmood]');
    if (fm) {
      var parts = fm.dataset.formmood.split(':');
      var hidden = document.querySelector('#rowForm [data-col="' + parts[0] + '"]');
      if (hidden) hidden.value = parts[1];
      var sibs = fm.parentNode.querySelectorAll('.mood');
      for (var q = 0; q < sibs.length; q++) sibs[q].setAttribute('aria-pressed', sibs[q] === fm ? 'true' : 'false');
      return;
    }

    var back = e.target.closest('.modal-back');
    if (back && e.target === back) { closeRow(); return; }

    var rowEl = e.target.closest('tr[data-row]');
    if (rowEl && !e.target.closest('button') && !e.target.closest('.more')) {
      openRow(rowEl.dataset.row);
      return;
    }

    var el = e.target.closest('[data-act],[data-edit],[data-del],[data-tpl],[data-rmcol],[data-mic]');
    if (!el) return;
    var t = tFind(curId);

    if (el.dataset.mic) { startMic(el.dataset.mic, el); return; }
    if (el.dataset.tpl) {
      var tpl = TEMPLATES.filter(function (x) { return x.id === el.dataset.tpl; })[0];
      renderColEditor('new', tpl);
      return;
    }
    if (el.dataset.rmcol !== undefined) {
      if (colDraft.length <= 1) { toast('Хотя бы одна колонка нужна'); return; }
      syncColDraft();
      colDraft.splice(parseInt(el.dataset.rmcol, 10), 1);
      renderColList();
      return;
    }
    if (el.dataset.edit) {
      var row = t.rows.filter(function (x) { return x.id === el.dataset.edit; })[0];
      closeRow();
      if (row) renderForm(row);
      return;
    }
    if (el.dataset.del) {
      // Спрашиваем всегда: случайно задетая мусорка не должна стирать запись
      if (!confirm('Удалить эту запись? Отменить будет нельзя.')) return;
      closeRow();
      t.rows = t.rows.filter(function (x) { return x.id !== el.dataset.del; });
      tSave();
      renderPanel();
      return;
    }

    switch (el.dataset.act) {
      case 'quicksave': quickSave(false); break;
      case 'quickmore': quickSave(true); break;
      case 'quickcancel':
        quickSel = { mood: null, acts: [] };
        renderQuick();
        break;
      case 'addrow':
        renderForm(null);
        break;
      case 'cancelrow':
        editingRow = null;
        document.getElementById('formHost').innerHTML = '';
        break;
      case 'saverow':
        saveRow();
        break;
      case 'cfg':
        renderColEditor('cfg');
        break;
      case 'addcol':
        syncColDraft();
        colDraft.push({ id: uid(), name: 'Новая колонка', type: 'text', list: '', hint: '' });
        renderColList();
        break;
      case 'savecols':
        saveCols();
        break;
      case 'closedlg':
        document.getElementById('dialogs').innerHTML = '';
        break;
      case 'closerow':
        closeRow();
        break;
      case 'rename':
        var nn = prompt('Новое название таблицы:', t.name);
        if (nn && nn.trim()) { t.name = nn.trim(); tSave(); renderTabs(); renderPanel(); }
        break;
      case 'droptable':
        if (!confirm('Удалить таблицу «' + t.name + '» вместе со всеми записями? Отменить будет нельзя.')) return;
        tables = tables.filter(function (x) { return x.id !== curId; });
        if (!tables.length) tables = [tFromTemplate(TEMPLATES[0])];
        curId = tables[0].id;
        tSave();
        renderTabs();
        renderPanel();
        break;
      case 'csv':
        exportCSV();
        break;
      case 'copy':
        copyText(asText());
        break;
      case 'print':
        window.print();
        break;
      case 'backup':
        downloadFile('pingvinnik-kopiya-' + todayISO() + '.json', JSON.stringify({ v: 1, tables: tables }, null, 1), 'application/json');
        toast('Копия скачана');
        break;
      case 'restore':
        restoreBackup();
        break;
    }
  });
}

function syncColDraft() {
  // Подтягиваем то, что пользователь уже напечатал, чтобы не терять при перерисовке
  var names = document.querySelectorAll('[data-cname]');
  for (var i = 0; i < names.length; i++) {
    var idx = parseInt(names[i].dataset.cname, 10);
    if (colDraft[idx]) colDraft[idx].name = names[i].value;
  }
  var types = document.querySelectorAll('[data-ctype]');
  for (var j = 0; j < types.length; j++) {
    var k = parseInt(types[j].dataset.ctype, 10);
    if (colDraft[k]) colDraft[k].type = types[j].value;
  }
}

function saveRow() {
  var t = tFind(curId);
  var fields = document.querySelectorAll('#rowForm [data-col]');
  var cells = {}, filled = false;
  for (var i = 0; i < fields.length; i++) {
    var v = fields[i].value;
    cells[fields[i].dataset.col] = v;
    if (v !== '' && !fields[i].dataset.scale && fields[i].type !== 'date' && fields[i].type !== 'time') filled = true;
  }
  if (!filled && !confirm('Запись почти пустая. Всё равно сохранить?')) return;

  if (editingRow) {
    for (var r = 0; r < t.rows.length; r++) if (t.rows[r].id === editingRow) t.rows[r].c = cells;
  } else {
    t.rows.push({ id: uid(), ts: Date.now(), c: cells });
  }
  editingRow = null;
  tSave();
  renderPanel();
  praise();
}

function saveCols() {
  syncColDraft();
  for (var i = 0; i < colDraft.length; i++) {
    if (!colDraft[i].name.trim()) colDraft[i].name = 'Колонка ' + (i + 1);
  }
  var mode = document.getElementById('colMode').value;
  if (mode === 'new') {
    var nameEl = document.getElementById('tblName');
    var name = (nameEl && nameEl.value.trim()) || 'Моя таблица';
    tables.push({ id: uid(), name: name, icon: 'notebook', cols: colDraft.slice(), rows: [] });
    curId = tables[tables.length - 1].id;
    toast('Таблица создана 🐧');
  } else {
    tFind(curId).cols = colDraft.slice();
    toast('Колонки сохранены');
  }
  tSave();
  document.getElementById('dialogs').innerHTML = '';
  renderTabs();
  renderPanel();
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { toast('Скопировано'); },
      function () { fallbackCopy(text); });
  } else fallbackCopy(text);
}
function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Скопировано'); } catch (e) { toast('Не удалось скопировать'); }
  ta.remove();
}

function restoreBackup() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = function () {
    var f = inp.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var data = JSON.parse(fr.result);
        if (!data.tables || !data.tables.length) throw 0;
        if (!confirm('Заменить текущие таблицы данными из файла? Текущие записи будут потеряны.')) return;
        tables = data.tables;
        curId = tables[0].id;
        tSave();
        renderTabs();
        renderPanel();
        toast('Восстановлено');
      } catch (e) {
        toast('Файл не похож на резервную копию');
      }
    };
    fr.readAsText(f);
  };
  inp.click();
}

document.addEventListener('DOMContentLoaded', tInit);
