/* Отрисовка каталога помощи из data/resources.js */

function renderRes() {
  var root = document.getElementById('resRoot');
  if (!root || typeof RES_GROUPS === 'undefined') return;
  var html = '';

  // Навигация по разделам
  html += '<div class="tabs" style="margin-bottom:18px">';
  for (var g = 0; g < RES_GROUPS.length; g++) {
    html += '<a class="btn sm ghost" href="#' + RES_GROUPS[g].id + '">' + iconOr(RES_GROUPS[g].icon) + ' ' + esc(RES_GROUPS[g].title) + '</a>';
  }
  html += '</div>';

  for (var i = 0; i < RES_GROUPS.length; i++) {
    var grp = RES_GROUPS[i];
    html += '<section id="' + grp.id + '" class="card' + (grp.id === 'crisis' ? '' : ' soft') + '"' +
            ' style="scroll-margin-top:16px">' +
            '<h2>' + iconOr(grp.icon) + esc(grp.title) + '</h2>' +
            '<p class="muted">' + esc(grp.intro) + '</p>';
    for (var j = 0; j < grp.items.length; j++) {
      var it = grp.items[j];
      html += '<div style="padding:14px 0;border-top:1px solid var(--line)">' +
              '<h3 style="margin-bottom:4px">' + esc(it.title) + '</h3>';
      if (it.phone) {
        html += '<p style="margin:0 0 6px"><a class="btn sm" href="tel:' + it.phone.replace(/\s/g, '') + '">' +
                icon('phone') + esc(it.phone) + '</a></p>';
      }
      html += '<p class="muted" style="margin:0 0 6px">' + esc(it.desc) + '</p>';
      if (it.url) {
        html += '<p style="margin:0"><a href="' + esc(it.url) + '"' +
                (it.internal ? '' : ' target="_blank" rel="noopener noreferrer"') + '>' +
                (it.internal ? 'Открыть у нас на сайте →' : esc(it.url.replace(/^https?:\/\//, '')) + ' →') + '</a></p>';
      }
      html += '</div>';
    }
    html += '</section>';
  }
  root.innerHTML = html;
  mountIcons(root);
}

document.addEventListener('DOMContentLoaded', renderRes);
