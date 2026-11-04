/* Страница «Темы»: выбор цветовой схемы, узора-обоев и своей картинки.
   Всё применяется сразу — пользователь видит результат на этой же странице. */

function thRenderThemes() {
  var cur = Store.get('theme', 'ice');
  var html = '';
  for (var i = 0; i < THEMES.length; i++) {
    var t = THEMES[i];
    html += '<button class="swatch theme-card" data-theme-pick="' + t.id + '" aria-pressed="' + (t.id === cur) + '">' +
      '<span class="pv ' + t.cls + '"></span>' +
      '<span class="nm">' + esc(t.name) + '</span></button>';
  }
  document.getElementById('themeList').innerHTML = html;
}

function thRenderPatterns() {
  var w = wallGet();
  var color = wallColor(w);
  var html = '<button class="swatch" data-pat="none" aria-pressed="' + (w.type !== 'pattern') + '">' +
    '<span class="pv"></span><span class="nm">Без узора</span></button>';
  for (var i = 0; i < PATTERNS.length; i++) {
    var p = PATTERNS[i];
    var on = w.type === 'pattern' && w.pattern === p.id;
    html += '<button class="swatch" data-pat="' + p.id + '" aria-pressed="' + on + '">' +
      '<span class="pv" style="background-image:' + patternURI(p, color, Math.max(w.alpha, 0.45)) +
      ';background-size:' + Math.round(PATTERN_TILE * 0.75) + 'px"></span>' +
      '<span class="nm">' + esc(p.name) + '</span></button>';
  }
  document.getElementById('patternList').innerHTML = html;
}

function thRenderImage() {
  var w = wallGet();
  var host = document.getElementById('imgPreview');
  var tools = document.getElementById('imgTools');
  var drop = document.getElementById('dropImgBtn');

  if (!w.img) {
    host.innerHTML = '<p class="muted">Картинка пока не выбрана.</p>';
    tools.innerHTML = '';
    return;
  }

  host.innerHTML = '<img class="preview-img" src="' + w.img + '" alt="Текущий фон" ' +
    'style="max-height:170px;object-fit:cover;width:100%">';

  // Все настройки фона — здесь же, рядом с картинкой
  var h = '';
  if (w.type !== 'image') {
    h += '<p class="muted">Картинка сохранена, но сейчас включён узор.</p>' +
         '<div class="btn-row" style="margin-bottom:12px">' +
         '<button class="btn sm" data-act="useimg">Поставить эту картинку фоном</button></div>';
  } else {
    h += '<label class="f"><span>Приглушить фон: <output id="oVeilImg">' +
      Math.round(w.veil * 100) + '%</output> — если текст плохо читается, подними выше</span>' +
      '<input type="range" id="rVeilImg" min="0" max="85" step="5" value="' + Math.round(w.veil * 100) + '"></label>' +
      '<label class="f"><span>Как вписать</span><span class="chips">' +
      '<button type="button" class="chip" data-fit="cover" aria-pressed="' + (w.imgFit !== 'contain') + '">Заполнить экран</button>' +
      '<button type="button" class="chip" data-fit="contain" aria-pressed="' + (w.imgFit === 'contain') + '">Показать целиком</button>' +
      '</span></label>' +
      '<label class="f"><span>Масштаб: <output id="oZoom">' + Math.round(w.imgZoom * 100) + '%</output></span>' +
      '<input type="range" id="rZoom" min="100" max="250" step="5" value="' + Math.round(w.imgZoom * 100) + '"></label>';
  }
  h += '<div class="btn-row" style="margin-bottom:4px">' +
       '<button class="btn sm ghost" data-act="dropimg">Убрать картинку</button></div>';
  tools.innerHTML = h;
  mountIcons(tools);
}

function thRenderControls() {
  var w = wallGet();
  document.getElementById('rScale').value = Math.round(w.scale * 100);
  document.getElementById('rAlpha').value = Math.round(w.alpha * 100);
  document.getElementById('rVeil').value = Math.round(w.veil * 100);
  document.getElementById('cColor').value = toHex(wallColor(w));
  thLabels();
  // Блок настройки нужен при любом фоне, но часть ползунков — только для узора.
  // «Приглушить фон» нужен и для фото, иначе текст по нему не читается.
  // Карточка с ползунками узора нужна только при включённом узоре:
  // для своей картинки настройки живут рядом с ней.
  document.getElementById('tuning').style.display = (w.type === 'pattern') ? '' : 'none';
}

function thLabels() {
  var sc = +document.getElementById('rScale').value;
  document.getElementById('oScale').textContent = sc < 85 ? 'мельче' : (sc > 125 ? 'крупнее' : 'обычный');
  document.getElementById('oAlpha').textContent = document.getElementById('rAlpha').value + '%';
  document.getElementById('oVeil').textContent = document.getElementById('rVeil').value + '%';
}

/* Цвет из CSS может прийти как rgb(...) — приводим к hex для <input type="color"> */
function toHex(c) {
  c = String(c).trim();
  if (c.charAt(0) === '#') {
    if (c.length === 4) return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    return c.slice(0, 7);
  }
  var m = c.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!m) return '#ff9a76';
  return '#' + [1, 2, 3].map(function (i) {
    var h = (+m[i]).toString(16);
    return h.length < 2 ? '0' + h : h;
  }).join('');
}

/* Своя картинка: ужимаем до 1400px и кладём в localStorage.
   Без этого большое фото просто не влезет в хранилище браузера. */
function thPickImage() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = function () {
    var f = inp.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1400;
        var k = Math.min(1, max / Math.max(img.width, img.height));
        var cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k);
        cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        var data = cv.toDataURL('image/jpeg', 0.82);
        if (data.length > 3500000) {
          toast('Картинка слишком тяжёлая, попробуй другую');
          return;
        }
        var w = wallGet();
        w.img = data;
        w.type = 'image';
        if (!w.veil) w.veil = 0.3; // чтобы текст поверх фото читался
        wallSet(w);
        thRenderAll();
        toast('Фон обновлён 🐧');
      };
      img.onerror = function () { toast('Не получилось открыть этот файл'); };
      img.src = fr.result;
    };
    fr.readAsDataURL(f);
  };
  inp.click();
}

function thRenderAll() {
  thRenderThemes();
  thRenderPatterns();
  thRenderImage();
  thRenderControls();
}

function thInit() {
  if (!document.getElementById('themeList')) return;
  thRenderAll();
  renderQuizCard();

  document.body.addEventListener('click', function (e) {
    var el = e.target.closest('[data-theme-pick],[data-pat],[data-act],[data-fit]');
    if (!el) return;
    var w = wallGet();

    if (el.dataset.themePick) {
      applyTheme(el.dataset.themePick);
      // Если цвет узора не задан вручную — он поедет за темой
      thRenderAll();
      return;
    }
    if (el.dataset.fit) {
      w.imgFit = el.dataset.fit;
      wallSet(w);
      thRenderAll();
      return;
    }
    if (el.dataset.pat) {
      if (el.dataset.pat === 'none') {
        w.type = 'none';
      } else {
        w.type = 'pattern';
        w.pattern = el.dataset.pat;
      }
      wallSet(w);
      thRenderAll();
      return;
    }
    switch (el.dataset.act) {
      case 'forgetquiz':
        Store.del('quiz.last');
        renderQuizCard();
        toast('Результат забыт. Анкету можно пройти заново когда угодно');
        break;
      case 'pickimg': thPickImage(); break;
      case 'useimg': w.type = 'image'; wallSet(w); thRenderAll(); break;
      case 'dropimg':
        w.img = '';
        if (w.type === 'image') w.type = 'none';
        wallSet(w);
        thRenderAll();
        toast('Картинка убрана');
        break;
      case 'useimg2':
        break;
      case 'autocolor':
        w.color = '';
        wallSet(w);
        thRenderAll();
        break;
      case 'reset':
        if (!confirm('Вернуть тему «Лёд» и чистый фон?')) return;
        Store.del('wall');
        applyTheme('ice');
        applyWallpaper();
        thRenderAll();
        toast('Оформление сброшено');
        break;
    }
  });

  document.body.addEventListener('input', function (e) {
    var id = e.target.id;
    // Ползунки в карточке «Своя картинка»
    if (id === 'rVeilImg' || id === 'rZoom') {
      var wi = wallGet();
      if (id === 'rVeilImg') {
        wi.veil = +e.target.value / 100;
        document.getElementById('oVeilImg').textContent = e.target.value + '%';
      } else {
        wi.imgZoom = +e.target.value / 100;
        document.getElementById('oZoom').textContent = e.target.value + '%';
      }
      wallSet(wi);
      return;
    }
    if (id !== 'rScale' && id !== 'rAlpha' && id !== 'rVeil' && id !== 'cColor') return;
    var w = wallGet();
    w.scale = +document.getElementById('rScale').value / 100;
    w.alpha = +document.getElementById('rAlpha').value / 100;
    w.veil = +document.getElementById('rVeil').value / 100;
    if (id === 'cColor') w.color = document.getElementById('cColor').value;
    wallSet(w);
    thLabels();
    if (id === 'cColor') thRenderPatterns();
  });
}

document.addEventListener('DOMContentLoaded', thInit);

/* ---------- Прошлый результат анкеты ----------
   Сами ответы мы не храним — только итог, поэтому «поправить» означает
   пройти заново. Пишем это прямо, чтобы не обещать лишнего. */
function renderQuizCard() {
  var host = document.getElementById('quizCard');
  if (!host) return;
  var last = Store.get('quiz.last', null);
  var html = '<h2>' + icon('compass') + 'Твои ответы в анкете</h2>';
  if (!last || !last.top || !last.top.length) {
    html += '<p class="muted">Анкета пока не пройдена. Это 16 коротких вопросов — ' +
      'они подскажут, с чего разумно начать.</p>' +
      '<a class="btn" href="quiz.html">Пройти анкету</a>';
  } else {
    var names = [];
    for (var i = 0; i < last.top.length && i < 3; i++) {
      var d = (typeof DOMAINS !== 'undefined') ? DOMAINS[last.top[i].id] : null;
      names.push(d ? d.title : last.top[i].id);
    }
    html += '<p class="muted">Последний раз: ' + esc(last.date) + '. Направления: ' +
      esc(names.join(', ')) + '.</p>' +
      '<p class="muted">Сами ответы нигде не хранятся — только этот итог. Чтобы его изменить, ' +
      'анкету нужно пройти заново: это пять минут, и состояние за неделю правда меняется.</p>' +
      '<div class="btn-row"><a class="btn" href="quiz.html">Пройти заново</a>' +
      '<button class="btn ghost" data-act="forgetquiz">Забыть результат</button></div>';
  }
  host.innerHTML = html;
  mountIcons(host);
}
