/* Раздел «Передышка»: тихий режим и план на сенсорную перегрузку.

   Главное требование к этой странице — она должна работать для человека,
   которому прямо сейчас тяжело читать. Поэтому план показывается по одному шагу,
   крупно и без прокрутки, а решений от человека не требует почти никаких. */

var QUIET = 'quiet';
var prevTheme = '';   // тема, с которой пришли, чтобы было куда вернуться

/* ---------- Тихий режим ---------- */
function quietOn() {
  return (Store.get('theme', 'ice') === QUIET);
}

function renderQuiet() {
  var on = quietOn();
  var btn = document.getElementById('quietBtn');
  btn.innerHTML = (on ? icon('check') : icon('moon')) +
    (on ? ' Тихий режим включён' : ' Включить тихий режим');
  btn.className = on ? 'btn ghost' : 'btn';
  document.getElementById('quietState').textContent = on
    ? 'Сейчас тихо: без анимаций и декора. Выключить можно этой же кнопкой.'
    : 'Сейчас обычный вид. Тихий режим ничего не удаляет — он только убирает движение и шум оформления.';
}

function toggleQuiet() {
  if (quietOn()) {
    applyTheme(prevTheme && prevTheme !== QUIET ? prevTheme : 'ice');
  } else {
    prevTheme = Store.get('theme', 'ice');
    applyTheme(QUIET);
  }
  renderQuiet();
}

/* ---------- План на перегрузку ----------
   Шаги идут от «уйти из потока» к «дать телу одно понятное ощущение».
   Нигде не требуем говорить, объяснять и решать: при перегрузке это самое тяжёлое. */
var PLAN = [
  {
    t: 'Уйди туда, где меньше',
    d: 'Подойдёт что угодно: туалет, лестница, машина, угол комнаты. Не нужно уходить красиво и не нужно никому объяснять.'
  },
  {
    t: 'Убери звук и свет',
    d: 'Наушники, капюшон, ладони на уши. Закрой глаза или выключи верхний свет. Этого часто достаточно, чтобы стало тише внутри.'
  },
  {
    t: 'Ничего не решай',
    d: 'Сейчас не время для разговоров, ответов и выборов. Всё это подождёт и не станет хуже от того, что ты сделаешь паузу.'
  },
  {
    t: 'Дай телу одно ощущение',
    d: 'Холодная вода на запястья, плед, давление ладоней на плечи. Одно простое ощущение вместо десяти сразу.'
  },
  {
    t: 'Побудь столько, сколько нужно',
    d: 'Перегрузка проходит сама, если её не подгонять. Ты ничего не нарушаешь тем, что ждёшь.'
  }
];
var planStep = 0;

function renderPlan() {
  var s = PLAN[planStep];
  document.getElementById('plan').innerHTML =
    '<p class="plan-n">Шаг ' + (planStep + 1) + ' из ' + PLAN.length + '</p>' +
    '<h3 class="plan-t">' + esc(s.t) + '</h3>' +
    '<p class="plan-d">' + esc(s.d) + '</p>';

  var btns = '';
  if (planStep > 0) btns += '<button class="btn ghost" data-plan="back">Назад</button>';
  btns += planStep < PLAN.length - 1
    ? '<button class="btn" data-plan="next">Дальше</button>'
    : '<button class="btn" data-plan="done">Мне легче</button>';
  if (planStep > 0) btns += '<button class="btn ghost" data-plan="reset">Сначала</button>';
  document.getElementById('planBtns').innerHTML = btns;
  mountIcons(document.getElementById('planBtns'));
}

function sInit() {
  prevTheme = Store.get('theme', 'ice');
  renderQuiet();
  renderPlan();
  mountIcons();

  document.getElementById('quietBtn').addEventListener('click', toggleQuiet);

  document.body.addEventListener('click', function (e) {
    var el = e.target.closest('[data-plan]');
    if (!el) return;
    switch (el.dataset.plan) {
      case 'next': planStep = Math.min(PLAN.length - 1, planStep + 1); break;
      case 'back': planStep = Math.max(0, planStep - 1); break;
      case 'reset': planStep = 0; break;
      case 'done':
        planStep = 0;
        toast('Хорошо. Возвращайся, когда понадобится 🐧');
        break;
    }
    renderPlan();
  });
}

document.addEventListener('DOMContentLoaded', sInit);
