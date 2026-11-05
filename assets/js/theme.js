// Фон в стиле сайта-образца: мерцающие звёзды (CSS) и плывущие золотые светлячки.
(function () {
  "use strict";
  var fx = document.createElement("div");
  fx.className = "bg-fx";
  fx.setAttribute("aria-hidden", "true");
  var html = '<div class="stars"></div>';
  var count = Math.max(8, Math.min(18, Math.round(window.innerWidth / 90)));
  function r(a, b) { return a + Math.random() * (b - a); }
  for (var i = 0; i < count; i++) {
    var size = r(8, 26);
    html += '<i class="ff" style="left:' + r(0, 100).toFixed(1) + '%;top:' + r(0, 100).toFixed(1) +
      '%;width:' + size.toFixed(0) + 'px;height:' + size.toFixed(0) + 'px;--d:' + r(10, 22).toFixed(1) +
      's;--g:' + r(2.5, 6).toFixed(1) + 's;--dx:' + r(-60, 60).toFixed(0) + 'px;--dy:' + r(-70, 40).toFixed(0) +
      'px;animation-delay:-' + r(0, 10).toFixed(1) + 's"></i>';
  }
  fx.innerHTML = html;
  document.body.insertBefore(fx, document.body.firstChild);
})();
