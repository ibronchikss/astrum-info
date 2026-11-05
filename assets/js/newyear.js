// Новогоднее оформление: снегопад, гирлянда, отсчёт до Нового года, кнопка включения.
(function () {
  "use strict";

  var KEY = "astrum-ny";
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* без хранилища просто не запоминаем */ }
  }
  function enabled() { return root.getAttribute("data-ny") !== "off"; }

  // Главный выключатель: пока на <html> стоит data-ny-lock, новогодняя тема полностью отключена
  // (ни снега, ни гирлянды, ни кнопки). Чтобы вернуть её — уберите data-ny="off" data-ny-lock
  // из тега <html> на страницах (см. README).
  if (root.hasAttribute("data-ny-lock")) return;

  if (stored() === "off") root.setAttribute("data-ny", "off");

  // --- Какая это страница -----------------------------------------------------
  // У каждого раздела свои украшения: CSS цепляется за html[data-ny-page].
  var PAGES = { index: "home", shop: "shop", rules: "rules", wiki: "wiki", "wiki-how-play": "wiki", "wiki-links": "wiki", navigation: "navigation", more: "more" };
  var file = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  var page = PAGES[file] || "home";
  root.setAttribute("data-ny-page", page);

  // --- Гирлянда ------------------------------------------------------------
  var PALETTES = {
    home: ["#e63950", "#ffc857", "#2fb87a", "#4aa8ff", "#c77dff"],
    shop: ["#e63950", "#ffc857", "#ff8a3d", "#ffc857", "#2fb87a"],
    rules: ["#e63950", "#ffffff", "#e63950", "#ffffff", "#ffc857"],
    wiki: ["#8ec5ff", "#ffffff", "#c9a8ff", "#4aa8ff", "#dff0ff"],
    navigation: ["#2fb87a", "#ffc857", "#4aa8ff", "#2fb87a", "#ff5a6e"],
    more: ["#ff8a3d", "#ffc857", "#e63950", "#ffd98a", "#ff8a3d"]
  };
  var COLORS = PALETTES[page];
  var STEP = 120;      // ширина одной «дуги» провода (совпадает с картинкой в CSS)
  var garland = document.createElement("div");
  garland.className = "ny-garland";
  garland.setAttribute("aria-hidden", "true");
  document.body.insertBefore(garland, document.body.firstChild);

  function buildGarland() {
    var width = root.clientWidth;
    var arcs = Math.ceil(width / STEP);
    var html = "";
    for (var a = 0; a < arcs; a++) {
      for (var k = 0; k < 3; k++) {
        var t = (k + 0.5) / 3;
        var x = a * STEP + t * STEP;
        var y = 3 + 68 * t * (1 - t); // высота провода в этой точке
        var n = a * 3 + k;
        html += '<i style="left:' + x.toFixed(1) + "px;top:" + (y + 1).toFixed(1) + "px;--c:" +
          COLORS[n % COLORS.length] + ";--d:-" + ((n * 0.55) % 2.4).toFixed(2) + 's"></i>';
      }
    }
    garland.innerHTML = html;
  }
  buildGarland();
  var resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildGarland, 150);
  });

  // --- Снегопад: снежинки-кристаллы -------------------------------------------
  // Несколько форм рисуем заранее на маленьких холстах и потом только поворачиваем и двигаем.
  var canvas = document.createElement("canvas");
  canvas.className = "ny-snow";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  var flakes = [];
  var W = 0, H = 0, dpr = 1, raf = 0, last = 0;

  var SPRITE = 96;       // размер заготовки, px
  var KINDS = 5;
  var sprites = { dark: [], light: [] };

  function arm(g, kind) {
    // одна из шести «лап» кристалла; рисуем вдоль оси вверх от центра
    var R = 40;
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(0, -R);
    g.stroke();
    if (kind === 0) {            // ветвистая звезда
      [[0.38, 0.28], [0.62, 0.2]].forEach(function (b) {
        var y = -R * b[0], len = R * b[1] * 1.9;
        g.beginPath();
        g.moveTo(0, y); g.lineTo(len * 0.5, y - len * 0.5);
        g.moveTo(0, y); g.lineTo(-len * 0.5, y - len * 0.5);
        g.stroke();
      });
    } else if (kind === 1) {     // ромбики на концах
      g.beginPath();
      g.moveTo(0, -R * 0.62); g.lineTo(7, -R * 0.8); g.lineTo(0, -R); g.lineTo(-7, -R * 0.8); g.closePath();
      g.stroke();
      g.beginPath(); g.arc(0, -R * 0.3, 2.2, 0, 7); g.fill();
    } else if (kind === 2) {     // вилочки
      [[0.55, 0.3], [0.85, 0.2]].forEach(function (b) {
        var y = -R * b[0], len = R * b[1] * 1.6;
        g.beginPath();
        g.moveTo(0, y); g.lineTo(len * 0.7, y - len * 0.6);
        g.moveTo(0, y); g.lineTo(-len * 0.7, y - len * 0.6);
        g.stroke();
      });
    } else if (kind === 3) {     // пластинка: шестиугольник и короткие лучи
      g.beginPath();
      g.moveTo(0, -R * 0.55); g.lineTo(R * 0.17, -R * 0.4);
      g.moveTo(0, -R * 0.55); g.lineTo(-R * 0.17, -R * 0.4);
      g.stroke();
    } else {                     // простой кристаллик с точкой
      g.beginPath(); g.arc(0, -R, 3, 0, 7); g.fill();
      g.beginPath();
      g.moveTo(0, -R * 0.5); g.lineTo(6, -R * 0.68); g.moveTo(0, -R * 0.5); g.lineTo(-6, -R * 0.68);
      g.stroke();
    }
  }

  function makeSprite(kind, light) {
    var c = document.createElement("canvas");
    c.width = c.height = SPRITE;
    var g = c.getContext("2d");
    g.translate(SPRITE / 2, SPRITE / 2);
    g.lineCap = "round";
    g.lineJoin = "round";
    var core = light ? "#7fb0f0" : "#ffffff";
    g.strokeStyle = core;
    g.fillStyle = core;
    g.shadowColor = light ? "rgba(60,110,190,0.55)" : "rgba(170,205,255,0.95)";
    g.shadowBlur = light ? 3 : 5;
    g.lineWidth = kind === 3 ? 3 : 2.6;
    for (var i = 0; i < 6; i++) {
      g.save();
      g.rotate(i * Math.PI / 3);
      arm(g, kind);
      g.restore();
    }
    if (kind === 3) {            // контур шестиугольника
      g.beginPath();
      for (var k = 0; k < 6; k++) {
        var an = k * Math.PI / 3 - Math.PI / 2;
        g.lineTo(Math.cos(an) * 17, Math.sin(an) * 17);
      }
      g.closePath();
      g.stroke();
    }
    g.beginPath(); g.arc(0, 0, 3.4, 0, 7); g.fill();
    return c;
  }

  for (var kd = 0; kd < KINDS; kd++) {
    sprites.dark.push(makeSprite(kd, false));
    sprites.light.push(makeSprite(kd, true));
  }

  function resizeSnow() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var count = Math.max(16, Math.min(52, Math.round(W / 28)));
    while (flakes.length < count) flakes.push(makeFlake(true));
    flakes.length = count;
  }

  function makeFlake(anywhere) {
    var size = 13 + Math.pow(Math.random(), 1.5) * 32;       // чаще мелкие, изредка крупные
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -40,
      size: size,
      kind: Math.floor(Math.random() * KINDS),
      vy: 16 + size * 1.5 + Math.random() * 14,              // крупные «ближе» и падают быстрее
      amp: 10 + Math.random() * 26,
      ph: Math.random() * Math.PI * 2,
      sp: 0.35 + Math.random() * 0.8,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.9,
      o: 0.55 + Math.random() * 0.4
    };
  }

  function draw(now) {
    raf = requestAnimationFrame(draw);
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var set = root.getAttribute("data-theme") === "light" ? sprites.light : sprites.dark;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.vy * dt;
      f.ph += f.sp * dt;
      f.rot += f.spin * dt;
      if (f.y > H + 40) { flakes[i] = makeFlake(false); continue; }
      var x = f.x + Math.sin(f.ph) * f.amp;
      ctx.save();
      ctx.translate(x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.o;
      ctx.drawImage(set[f.kind], -f.size / 2, -f.size / 2, f.size, f.size);
      ctx.restore();
    }
  }

  function startSnow() {
    if (reduce || raf || !enabled() || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(draw);
  }
  function stopSnow() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  resizeSnow();
  window.addEventListener("resize", resizeSnow);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopSnow(); else startSnow();
  });
  startSnow();

  // --- Олени ------------------------------------------------------------------
  // Стадо пробегает по нижнему краю окна раз в минуту, каждый раз в другую сторону.
  var herd = document.createElement("div");
  herd.className = "ny-herd";
  herd.setAttribute("aria-hidden", "true");
  herd.innerHTML = '<i class="ny-deer"></i><i class="ny-deer"></i><i class="ny-deer"></i><i class="ny-deer lead"></i>';
  document.body.appendChild(herd);

  var herdTimer = 0;
  var direction = 1;
  function scheduleHerd(ms) {
    if (page === "home") return;   // на главной бегать по земле не нужно: там летает только Дед Мороз
    clearTimeout(herdTimer);
    herdTimer = setTimeout(runHerd, ms);
  }
  function runHerd() {
    if (reduce) return;
    if (!enabled() || document.hidden) { scheduleHerd(15000); return; }
    herd.className = "ny-herd " + (direction > 0 ? "run-r" : "run-l");
    direction = -direction;
  }
  herd.addEventListener("animationend", function (e) {
    if (e.target !== herd) return;
    herd.className = "ny-herd";
    scheduleHerd(35000 + Math.random() * 25000);
  });
  scheduleHerd(4000);

  // Дед Мороз на санях пролетает высоко над страницей реже, чем бегут олени на земле.
  var santa = document.createElement("div");
  santa.className = "ny-santa";
  santa.setAttribute("aria-hidden", "true");
  santa.innerHTML = '<div class="ny-santa-in"><i class="ny-trail"></i><i class="ny-sleigh"></i>' +
    '<i class="ny-deer"></i><i class="ny-deer"></i><i class="ny-deer lead"></i></div>';
  document.body.appendChild(santa);

  var santaTimer = 0;
  var santaDir = 1;
  function scheduleSanta(ms) {
    clearTimeout(santaTimer);
    santaTimer = setTimeout(flySanta, ms);
  }
  function flySanta() {
    if (reduce) return;
    if (!enabled() || document.hidden) { scheduleSanta(15000); return; }
    santa.className = "ny-santa " + (santaDir > 0 ? "fly-r" : "fly-l");
    santaDir = -santaDir;
  }
  santa.addEventListener("animationend", function (e) {
    if (e.target !== santa) return;
    santa.className = "ny-santa";
    scheduleSanta(60000 + Math.random() * 40000);
  });
  scheduleSanta(14000);

  // Искры за курсором (только там, где есть мышь)
  if (!reduce && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var lastSpark = 0;
    var live = 0;
    var GLYPHS = ["✦", "✧", "❄", "✦"];
    var TINTS = ["#ffd75e", "#8ec5ff", "#ff7a8a", "#7be0a8", "#ffffff"];
    document.addEventListener("pointermove", function (e) {
      var now = performance.now();
      if (now - lastSpark < 70 || live > 14 || !enabled()) return;
      lastSpark = now;
      var el = document.createElement("span");
      el.className = "ny-spark";
      el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      el.style.left = e.clientX + "px";
      el.style.top = e.clientY + "px";
      el.style.color = TINTS[Math.floor(Math.random() * TINTS.length)];
      el.style.setProperty("--dx", (Math.random() * 30 - 15).toFixed(0) + "px");
      el.style.fontSize = (9 + Math.random() * 9).toFixed(0) + "px";
      document.body.appendChild(el);
      live++;
      el.addEventListener("animationend", function () { el.remove(); live--; });
    }, { passive: true });
  }

  // --- Кнопка ----------------------------------------------------------------
  var tools = document.querySelector(".header-tools");
  if (tools) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ny-toggle";
    btn.title = "Новогоднее оформление";
    btn.setAttribute("aria-label", "Включить или выключить новогоднее оформление");
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 2v20M4.9 6.5l14.2 11M19.1 6.5 4.9 17.5"/><path d="m9.5 3.5 2.5 2 2.5-2M9.5 20.5l2.5-2 2.5 2"/></svg>';
    btn.addEventListener("click", function () {
      var on = enabled();
      root.setAttribute("data-ny", on ? "off" : "on");
      store(on ? "off" : "on");
      if (on) {
        stopSnow();
        herd.className = "ny-herd";
        santa.className = "ny-santa";
      } else {
        startSnow();
        scheduleHerd(2500);
        scheduleSanta(9000);
      }
    });
    tools.insertBefore(btn, tools.firstChild);
  }

  // --- Отсчёт до Нового года --------------------------------------------------
  var box = document.querySelector(".ny-countdown");
  if (box) {
    var out = box.querySelector(".ny-countdown-time");
    var label = box.querySelector(".ny-countdown-label");
    var pad = function (n) { return n < 10 ? "0" + n : String(n); };
    var tick = function () {
      var now = new Date();
      var y = now.getFullYear();
      // с 1 по 7 января поздравляем, дальше считаем до следующего Нового года
      var greeting = now.getMonth() === 0 && now.getDate() <= 7;
      box.classList.toggle("is-done", greeting);
      if (greeting) {
        label.textContent = "Astrum поздравляет";
        out.innerHTML = "<b>С Новым " + y + " годом!</b>";
        return;
      }
      var left = new Date(y + 1, 0, 1) - now;
      var s = Math.max(0, Math.floor(left / 1000));
      var d = Math.floor(s / 86400);
      var h = Math.floor(s % 86400 / 3600);
      var m = Math.floor(s % 3600 / 60);
      label.textContent = "До Нового года";
      out.innerHTML = "<span><b>" + d + "</b><small>д</small></span><span><b>" + pad(h) +
        "</b><small>ч</small></span><span><b>" + pad(m) + "</b><small>м</small></span><span><b>" +
        pad(s % 60) + "</b><small>с</small></span>";
    };
    tick();
    setInterval(tick, 1000);
  }
})();
