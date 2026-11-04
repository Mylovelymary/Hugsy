/* Узоры для фона. РисуютсяSVG прямо в браузере, поэтому весят ноль и
   перекрашиваются под цвет темы. Каждая фигурка умещается в квадрат 20×20,
   на плитке 60×60 их две — по диагонали, чтобы рисунок стыковался без швов.

   Как добавить свой узор: допиши объект { id, name, draw: function (c) { ... } },
   где c — цвет. Координаты — от 0 до 20. Всё остальное произойдёт само. */

var PATTERNS = [
  {
    id: 'dots', name: 'Горошек',
    draw: function (c) { return '<circle cx="10" cy="10" r="3.5" fill="' + c + '"/>'; }
  },
  {
    id: 'flowers', name: 'Цветочки',
    draw: function (c) {
      var s = '';
      for (var i = 0; i < 5; i++) {
        var a = i * 72 * Math.PI / 180;
        s += '<circle cx="' + (10 + 5 * Math.sin(a)).toFixed(1) + '" cy="' + (10 - 5 * Math.cos(a)).toFixed(1) +
             '" r="3.2" fill="' + c + '"/>';
      }
      return s + '<circle cx="10" cy="10" r="2.4" fill="' + c + '" fill-opacity=".45"/>';
    }
  },
  {
    id: 'leaves', name: 'Осенние листочки',
    draw: function (c) {
      // Лист наклоняем и даём черешок — иначе издалека читается как капля
      return '<g transform="rotate(-28 10 10)">' +
             '<path d="M10 2 C17 6 17 13 10 16.5 C3 13 3 6 10 2 Z" fill="' + c + '"/>' +
             '<path d="M10 3 V19.5" stroke="' + c + '" stroke-width="1.1" stroke-linecap="round"/>' +
             '<path d="M10 7 L13.5 5.5 M10 10.5 L13.5 9 M10 7 L6.5 5.5 M10 10.5 L6.5 9" stroke="' + c +
             '" stroke-opacity=".45" stroke-width=".9" fill="none"/></g>';
    }
  },
  {
    id: 'hearts', name: 'Сердечки',
    draw: function (c) {
      return '<path d="M10 17.5 C2 11.5 3.5 5 7 5 C8.8 5 10 6.4 10 7.6 C10 6.4 11.2 5 13 5 C16.5 5 18 11.5 10 17.5 Z" fill="' + c + '"/>';
    }
  },
  {
    id: 'stars', name: 'Звёздочки',
    draw: function (c) {
      return '<path d="M10 2 L12.2 7.8 L18.5 8.2 L13.6 12.1 L15.3 18.2 L10 14.7 L4.7 18.2 L6.4 12.1 L1.5 8.2 L7.8 7.8 Z" fill="' + c + '"/>';
    }
  },
  {
    id: 'snow', name: 'Снежинки',
    draw: function (c) {
      var s = '<g stroke="' + c + '" stroke-width="1.3" stroke-linecap="round" fill="none">';
      for (var i = 0; i < 3; i++) {
        s += '<line x1="10" y1="10" x2="10" y2="2" transform="rotate(' + (i * 60) + ' 10 10)"/>' +
             '<line x1="10" y1="10" x2="10" y2="18" transform="rotate(' + (i * 60) + ' 10 10)"/>' +
             '<line x1="10" y1="5" x2="12.5" y2="3" transform="rotate(' + (i * 60) + ' 10 10)"/>' +
             '<line x1="10" y1="5" x2="7.5" y2="3" transform="rotate(' + (i * 60) + ' 10 10)"/>';
      }
      return s + '</g>';
    }
  },
  {
    id: 'paws', name: 'Лапки',
    draw: function (c) {
      return '<g fill="' + c + '"><ellipse cx="10" cy="13.5" rx="5" ry="4.2"/>' +
             '<ellipse cx="5.3" cy="7.6" rx="2.1" ry="2.7"/><ellipse cx="9" cy="5.6" rx="2.1" ry="2.8"/>' +
             '<ellipse cx="12.9" cy="6" rx="2.1" ry="2.8"/><ellipse cx="16" cy="9.2" rx="2" ry="2.5"/></g>';
    }
  },
  {
    id: 'fish', name: 'Рыбки',
    draw: function (c) {
      return '<g fill="' + c + '"><ellipse cx="9" cy="10" rx="7" ry="4.4"/>' +
             '<path d="M16 10 L20 6 L20 14 Z"/></g>' +
             '<circle cx="5.5" cy="8.8" r="1" fill="#fff" fill-opacity=".85"/>';
    }
  },
  {
    id: 'cars', name: 'Машинки',
    draw: function (c) {
      return '<g fill="' + c + '"><rect x="1" y="9" width="18" height="6" rx="2.2"/>' +
             '<path d="M5 9 L7 5 H13 L15.5 9 Z"/></g>' +
             '<circle cx="6" cy="15.5" r="2.4" fill="' + c + '"/><circle cx="14" cy="15.5" r="2.4" fill="' + c + '"/>' +
             '<circle cx="6" cy="15.5" r="1" fill="#fff" fill-opacity=".7"/><circle cx="14" cy="15.5" r="1" fill="#fff" fill-opacity=".7"/>';
    }
  },
  {
    id: 'penguins', name: 'Пингвинчики',
    draw: function (c) {
      return '<ellipse cx="10" cy="11" rx="6.5" ry="8" fill="' + c + '"/>' +
             '<ellipse cx="10" cy="12.5" rx="4.4" ry="6" fill="#fff" fill-opacity=".85"/>' +
             '<circle cx="8" cy="8.5" r="1" fill="' + c + '"/><circle cx="12" cy="8.5" r="1" fill="' + c + '"/>' +
             '<path d="M10 10 L8.6 12 L11.4 12 Z" fill="' + c + '" fill-opacity=".8"/>';
    }
  },
  {
    id: 'clouds', name: 'Облачка',
    draw: function (c) {
      return '<g fill="' + c + '"><circle cx="7" cy="12" r="4"/><circle cx="12" cy="11" r="5"/>' +
             '<circle cx="16" cy="13" r="3.2"/><rect x="6" y="12" width="11" height="4" rx="2"/></g>';
    }
  },
  {
    id: 'cups', name: 'Чашечки',
    draw: function (c) {
      return '<g fill="' + c + '"><path d="M4 7 H15 V13 A3.5 3.5 0 0 1 11.5 16.5 H7.5 A3.5 3.5 0 0 1 4 13 Z"/>' +
             '<rect x="3" y="17.5" width="13" height="1.8" rx="0.9"/></g>' +
             '<path d="M15 8.5 A3 3 0 0 1 15 14" stroke="' + c + '" stroke-width="1.6" fill="none"/>' +
             '<path d="M7 5 q1.5 -2 0 -4 M11 5 q1.5 -2 0 -4" stroke="' + c +
             '" stroke-opacity=".5" stroke-width="1" fill="none"/>';
    }
  },
  {
    id: 'moons', name: 'Месяцы и звёзды',
    draw: function (c) {
      return '<path d="M13.5 3 A8 8 0 1 0 13.5 17 A6.4 6.4 0 1 1 13.5 3 Z" fill="' + c + '"/>' +
             '<circle cx="17" cy="5" r="1.3" fill="' + c + '" fill-opacity=".6"/>';
    }
  },
  {
    id: 'rain', name: 'Капельки',
    draw: function (c) {
      return '<path d="M10 2 C14 8 15.5 11 15.5 13 A5.5 5.5 0 1 1 4.5 13 C4.5 11 6 8 10 2 Z" fill="' + c + '"/>';
    }
  }
];

/* Размер плитки: в неё помещаются две фигурки по диагонали */
var PATTERN_TILE = 60;
