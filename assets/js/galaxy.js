/*
 * ASTRUM — пиксельная галактика в блоке «Карта звёздного мира» (только главная).
 * Рисуется на маленьком canvas (1 клетка = несколько пикселей экрана) и растягивается без сглаживания,
 * поэтому всё — и звёзды, и логотип в центре — состоит из одинаковых квадратиков.
 * Это воссозданный с нуля декор, а не часть оригинального сайта.
 */
(function () {
  "use strict";

  var banner = document.querySelector(".pixel-world");
  var canvas = banner && banner.querySelector(".galaxy");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FRAME_MS = 100; // ~10 кадров в секунду — «ступенчатое» движение, как у пиксель-арта

  // --- Детерминированный генератор: картинка одинакова при каждой загрузке ---
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Палитра: от тёплого ядра цвета планеты до холодных краёв.
  var CORE = ["#ffe6fa", "#ffc4f1", "#ff9be8"];
  var INNER = ["#fb51d0", "#e63fc0", "#ff7fe0"];
  var MID = ["#c616a7", "#b44ad8", "#9a5cf0"];
  var OUTER = ["#7a6cf5", "#5a7bff", "#4f5fc4", "#6b3fa8"];
  var DUST = ["#3a2a52", "#2f2447"];

  var sprite = new Image();
  var spriteReady = false;
  sprite.onload = function () { spriteReady = true; layout(); };
  sprite.src = banner.getAttribute("data-sprite") || "assets/images/galaxy-logo.png";

  var W = 0, H = 0, P = 3, cx = 0, cy = 0, R = 0, TILT = 0.55;
  var stars = [], sparks = [], arms = [], planets = [], halo = null;

  function pick(rand, list) { return list[(rand() * list.length) | 0]; }

  function build() {
    var rand = rng(90125);
    stars = []; sparks = []; arms = []; planets = [];

    // Фоновые звёзды по всему блоку
    var starCount = Math.round((W * H) / 170);
    for (var i = 0; i < starCount; i++) {
      var bright = rand();
      stars.push({
        x: (rand() * W) | 0, y: (rand() * H) | 0,
        c: bright > 0.85 ? "#ffffff" : bright > 0.45 ? "#cfc4ff" : "#8a82ad",
        tw: rand() < 0.35, ph: rand() * 6.283, sp: 0.6 + rand() * 1.6
      });
    }
    // Крестики-вспышки
    for (var k = 0; k < 7; k++) {
      sparks.push({ x: 4 + ((rand() * (W - 8)) | 0), y: 4 + ((rand() * (H - 8)) | 0), ph: rand() * 6.283 });
    }

    // Частицы спиральных рукавов
    var n = Math.round(R * R * 0.6);
    for (var j = 0; j < n; j++) {
      var u = rand();
      var kind = rand();
      var bulge = kind < 0.18;
      var disc = !bulge && kind < 0.42;
      var r, th, col;
      if (disc) {
        // рассеянный диск между рукавами: плотнее к центру, редеет к краю
        r = R * Math.min(1, -Math.log(1 - rand() * 0.97) * 0.34) + 4;
        th = rand() * 6.283;
      } else if (bulge) {
        r = R * 0.2 * Math.abs((rand() + rand() + rand() - 1.5) / 1.5) * 1.6 + 2;
        th = rand() * 6.283;
      } else {
        r = R * (0.08 + 0.92 * Math.pow(u, 0.9));
        var arm = rand() < 0.5 ? 0 : 3.14159;
        var spread = (rand() + rand() + rand() - 1.5) * (0.24 + 0.36 * (1 - r / R));
        th = arm + (r / R) * 3.7 + spread;
      }
      var f = r / R;
      if (bulge || f < 0.16) col = pick(rand, f < 0.1 ? CORE : INNER);
      else if (f < 0.4) col = pick(rand, rand() < 0.55 ? INNER : MID);
      else if (f < 0.7) col = pick(rand, rand() < 0.65 ? MID : OUTER);
      else col = pick(rand, rand() < 0.7 ? OUTER : DUST);
      arms.push({ r: r, th: th, c: col });
    }

    // Три маленькие планеты на орбитах вокруг логотипа
    var orbits = [
      { rx: R * 0.5, c1: "#ffd9a0", c2: "#e8a24a", size: 3, sp: 0.5, ph: 0.6 },
      { rx: R * 0.68, c1: "#9fe3ff", c2: "#4aa7e8", size: 4, sp: -0.32, ph: 3.1 },
      { rx: R * 0.86, c1: "#d9b8ff", c2: "#8a5be0", size: 3, sp: 0.2, ph: 5.2 }
    ];
    orbits.forEach(function (o) { planets.push(o); });

    // Мягкое свечение вокруг логотипа — ступенчатое, чтобы тоже было «пиксельным»
    halo = document.createElement("canvas");
    halo.width = W; halo.height = H;
    var h = halo.getContext("2d");
    var hr = Math.min(R * 0.55, 58);
    var bands = [[1.0, 0.04], [0.82, 0.07], [0.64, 0.1], [0.46, 0.14], [0.3, 0.2]];
    bands.forEach(function (b) {
      h.fillStyle = "rgba(251,81,208," + b[1] + ")";
      var rx = hr * b[0], ry = rx * 0.78;
      for (var y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
        var span = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
        if (span > 0) h.fillRect(Math.round(cx) - span, Math.round(cy) + y, span * 2, 1);
      }
    });
  }

  function layout() {
    var cw = banner.clientWidth, ch = banner.clientHeight;
    if (!cw || !ch) return;
    var narrow = cw <= 760;
    P = narrow ? 2 : 3;
    W = Math.ceil(cw / P);
    H = Math.ceil(ch / P);
    canvas.width = W; canvas.height = H;
    canvas.style.width = W * P + "px";
    canvas.style.height = H * P + "px";
    ctx.imageSmoothingEnabled = false;
    if (narrow) {
      cx = W * 0.5; cy = H - 68;
      R = Math.min(W * 0.52, 130);
      TILT = 0.5;
    } else {
      cx = W * 0.7; cy = H * 0.5;
      R = Math.min(W * 0.31, (H * 0.5) / 0.5);
      TILT = 0.5;
    }
    cx = Math.round(cx); cy = Math.round(cy);
    build();
    draw(performance.now() / 1000);
  }

  function rect(c, x, y, w, h) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w || 1, h || 1);
  }

  function draw(t) {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    if (halo) ctx.drawImage(halo, 0, 0);

    // Звёзды фона
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (s.tw && Math.sin(t * s.sp + s.ph) < -0.35) continue;
      rect(s.c, s.x, s.y);
    }

    // Рукава галактики (вся картина медленно вращается)
    var rot = reduceMotion ? 0 : t * 0.06;
    for (var j = 0; j < arms.length; j++) {
      var a = arms[j];
      var th = a.th + rot;
      rect(a.c, Math.round(cx + a.r * Math.cos(th)), Math.round(cy + a.r * Math.sin(th) * TILT));
    }

    // Крестики-вспышки
    for (var k = 0; k < sparks.length; k++) {
      var p = sparks[k];
      var v = reduceMotion ? 1 : Math.sin(t * 1.3 + p.ph);
      if (v > 0.3) {
        rect("#ffffff", p.x, p.y);
        rect("#cfc4ff", p.x - 1, p.y); rect("#cfc4ff", p.x + 1, p.y);
        rect("#cfc4ff", p.x, p.y - 1); rect("#cfc4ff", p.x, p.y + 1);
      } else if (v > -0.4) {
        rect("#cfc4ff", p.x, p.y);
      }
    }

    // Орбиты и планеты
    for (var o = 0; o < planets.length; o++) {
      var pl = planets[o];
      var ry = pl.rx * TILT;
      var steps = Math.round(pl.rx * 1.3);
      for (var q = 0; q < steps; q += 2) {
        var ang = (q / steps) * 6.283;
        rect("#ffffff22", Math.round(cx + pl.rx * Math.cos(ang)), Math.round(cy + ry * Math.sin(ang)));
      }
      var pa = pl.ph + (reduceMotion ? 0 : t * pl.sp);
      var px = Math.round(cx + pl.rx * Math.cos(pa)), py = Math.round(cy + ry * Math.sin(pa));
      var behind = Math.sin(pa) < 0; // дальняя половина орбиты — планета уходит за логотип
      if (!behind || Math.abs(px - cx) > 40) {
        rect(pl.c2, px, py, pl.size, pl.size);
        rect(pl.c1, px, py, pl.size - 1 || 1, pl.size - 1 || 1);
      }
    }

    // Логотип в центре, раз в ~1,2 с «подпрыгивает» на клетку
    if (spriteReady) {
      var bob = reduceMotion ? 0 : (Math.floor(t / 1.2) % 2 === 0 ? 0 : -1);
      ctx.drawImage(sprite, Math.round(cx - sprite.width / 2), Math.round(cy - sprite.height / 2) + bob);
    }
  }

  // --- Анимация: только пока блок виден на экране ---
  var visible = true, last = 0, raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!visible || now - last < FRAME_MS) return;
    last = now;
    draw(now / 1000);
  }

  layout();
  if (!reduceMotion) raf = requestAnimationFrame(loop);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(banner);
  }
  if ("ResizeObserver" in window) {
    var lastW = banner.clientWidth, lastH = banner.clientHeight;
    new ResizeObserver(function () {
      if (banner.clientWidth !== lastW || banner.clientHeight !== lastH) {
        lastW = banner.clientWidth; lastH = banner.clientHeight;
        layout();
      }
    }).observe(banner);
  } else {
    window.addEventListener("resize", layout);
  }
})();
