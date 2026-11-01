/*
 * ASTRUM — пиксельная галактика в блоке «Карта звёздного мира» (только главная).
 * Рисуется на маленьком canvas (1 клетка = несколько пикселей экрана) и растягивается без сглаживания,
 * поэтому всё — звёзды, рукава, планеты и светящееся ядро — состоит из одинаковых квадратиков.
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

  // Палитра: от тёплого ядра цвета планеты до холодных краёв. Для светлой темы — отдельная,
  // чтобы звёзды и «пыль» не терялись на светлом фоне (переключается вместе с темой сайта).
  var PALETTES = {
    dark: {
      core: ["#ffe6fa", "#ffc4f1", "#ff9be8"], inner: ["#fb51d0", "#e63fc0", "#ff7fe0"],
      mid: ["#c616a7", "#b44ad8", "#9a5cf0"], outer: ["#7a6cf5", "#5a7bff", "#4f5fc4", "#6b3fa8"],
      dust: ["#3a2a52", "#2f2447"],
      starBright: "#ffffff", starMid: "#cfc4ff", starDim: "#8a82ad",
      sparkCore: "#ffffff", sparkArm: "#cfc4ff", orbit: "#ffffff22"
    },
    light: {
      core: ["#ffffff", "#ffd2f6", "#ff9be8"], inner: ["#f03cc4", "#d92fb4", "#ff6fdc"],
      mid: ["#b3129a", "#a23fcf", "#8648e0"], outer: ["#6a5be8", "#4a6cf0", "#3f4fb4", "#5a3498"],
      dust: ["#b9aee0", "#cbc1ea"],
      starBright: "#5b46b8", starMid: "#8d7ce0", starDim: "#b7abdc",
      sparkCore: "#6a3fd6", sparkArm: "#a595ee", orbit: "#5a3fa844"
    }
  };
  var pal = PALETTES.dark;
  function themePalette() {
    return document.documentElement.getAttribute("data-theme") === "light" ? PALETTES.light : PALETTES.dark;
  }

  var W = 0, H = 0, P = 3, cx = 0, cy = 0, R = 0, TILT = 0.55;
  var stars = [], sparks = [], arms = [], planets = [], halo = null;

  function pick(rand, list) { return list[(rand() * list.length) | 0]; }

  function build() {
    pal = themePalette();
    var rand = rng(90125);
    stars = []; sparks = []; arms = []; planets = [];

    // Фоновые звёзды по всему блоку
    var starCount = Math.round((W * H) / 170);
    for (var i = 0; i < starCount; i++) {
      var bright = rand();
      stars.push({
        x: (rand() * W) | 0, y: (rand() * H) | 0,
        c: bright > 0.85 ? pal.starBright : bright > 0.45 ? pal.starMid : pal.starDim,
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
      var bulge = kind < 0.24;
      var disc = !bulge && kind < 0.46;
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
      if (bulge || f < 0.16) col = pick(rand, f < 0.1 ? pal.core : pal.inner);
      else if (f < 0.4) col = pick(rand, rand() < 0.55 ? pal.inner : pal.mid);
      else if (f < 0.7) col = pick(rand, rand() < 0.65 ? pal.mid : pal.outer);
      else col = pick(rand, rand() < 0.7 ? pal.outer : pal.dust);
      arms.push({ r: r, th: th, c: col });
    }

    // Три маленькие планеты на орбитах вокруг ядра
    var orbits = [
      { rx: R * 0.3, c1: "#ffd9a0", c2: "#e8a24a", size: 3, sp: 0.5, ph: 0.6 },
      { rx: R * 0.5, c1: "#9fe3ff", c2: "#4aa7e8", size: 4, sp: -0.32, ph: 3.1 },
      { rx: R * 0.72, c1: "#d9b8ff", c2: "#8a5be0", size: 3, sp: 0.2, ph: 5.2 }
    ];
    orbits.forEach(function (o) { planets.push(o); });

    // Мягкое свечение вокруг ядра — ступенчатое, чтобы тоже было «пиксельным»
    halo = document.createElement("canvas");
    halo.width = W; halo.height = H;
    var h = halo.getContext("2d");
    var hr = Math.min(R * 0.5, 52);
    var bands = [[1.0, 0.04], [0.82, 0.07], [0.64, 0.1], [0.46, 0.14], [0.3, 0.2]];
    bands.forEach(function (b) {
      h.fillStyle = "rgba(251,81,208," + b[1] + ")";
      var rx = hr * b[0], ry = rx * 0.78;
      for (var y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
        var span = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
        if (span > 0) h.fillRect(Math.round(cx) - span, Math.round(cy) + y, span * 2, 1);
      }
    });

    // Яркое ядро: круг из ступенчатых «колец»; на стыках — шахматная раскладка вместо плавного перехода
    var cr = Math.max(9, Math.round(R * 0.1)), cry = cr * 0.72;
    var rings = [
      [1.0, "#fb51d0"], [0.8, "#ff7fe0"], [0.6, "#ffa9ec"], [0.42, "#ffd2f6"], [0.24, "#ffffff"]
    ];
    for (var yy = -Math.ceil(cry); yy <= Math.ceil(cry); yy++) {
      for (var xx = -cr; xx <= cr; xx++) {
        var dd = Math.sqrt((xx * xx) / (cr * cr) + (yy * yy) / (cry * cry));
        if (dd > 1) continue;
        var idx = 0;
        for (var q = 0; q < rings.length; q++) if (dd <= rings[q][0]) idx = q;
        // у границы кольца чередуем цвет с соседним, как дизеринг в пиксель-арте
        var colr = rings[idx][1];
        if (idx > 0 && dd > rings[idx][0] - 0.08 && (xx + yy) % 2 === 0) colr = rings[idx - 1][1];
        h.fillStyle = colr;
        h.fillRect(Math.round(cx) + xx, Math.round(cy) + yy, 1, 1);
      }
    }
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
        rect(pal.sparkCore, p.x, p.y);
        rect(pal.sparkArm, p.x - 1, p.y); rect(pal.sparkArm, p.x + 1, p.y);
        rect(pal.sparkArm, p.x, p.y - 1); rect(pal.sparkArm, p.x, p.y + 1);
      } else if (v > -0.4) {
        rect(pal.sparkArm, p.x, p.y);
      }
    }

    // Орбиты и планеты
    for (var o = 0; o < planets.length; o++) {
      var pl = planets[o];
      var ry = pl.rx * TILT;
      var steps = Math.round(pl.rx * 1.3);
      for (var q = 0; q < steps; q += 2) {
        var ang = (q / steps) * 6.283;
        rect(pal.orbit, Math.round(cx + pl.rx * Math.cos(ang)), Math.round(cy + ry * Math.sin(ang)));
      }
      var pa = pl.ph + (reduceMotion ? 0 : t * pl.sp);
      var px = Math.round(cx + pl.rx * Math.cos(pa)), py = Math.round(cy + ry * Math.sin(pa));
      rect(pl.c2, px, py, pl.size, pl.size);
      rect(pl.c1, px, py, pl.size - 1 || 1, pl.size - 1 || 1);
    }

    // Лучи над ядром: крест, который раз в ~1,2 с «дышит» на клетку
    var pulse = reduceMotion ? 1 : (Math.floor(t / 1.2) % 2 === 0 ? 1 : 0);
    var arm = Math.max(10, Math.round(R * 0.16)) + pulse * 2;
    for (var ray = 1; ray <= arm; ray++) {
      var tone = ray < arm * 0.4 ? "#ffffff" : ray < arm * 0.7 ? "#ffd2f6" : "#ff7fe0";
      rect(tone, cx + ray, cy); rect(tone, cx - ray, cy);
      if (ray <= arm * 0.7) { rect(tone, cx, cy + ray); rect(tone, cx, cy - ray); }
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

  // при переключении темы сайта галактика перерисовывается в нужной палитре
  if ("MutationObserver" in window) {
    new MutationObserver(function () { build(); draw(performance.now() / 1000); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

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
