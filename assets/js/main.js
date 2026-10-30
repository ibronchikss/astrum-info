/*
 * ASTRUM — минимальный скрипт для статичной копии сайта.
 * Оригинальный JS (Next.js/React) получить не удалось, поэтому поведение ниже
 * воссоздано по разметке:
 *   - мобильное меню, копирование IP, кнопка «Начать играть», индикатор онлайна;
 *   - поиск по правилам и по товарам;
 *   - окно товара в магазине.
 * Всё, что здесь описано, — реконструкция, а не копия оригинального кода.
 */
(function () {
  "use strict";

  var SERVER_IP = "astrums.pro";
  var STATUS_URL = "https://api.mcsrvstat.us/3/" + SERVER_IP;
  var STATUS_REFRESH_MS = 5 * 60 * 1000; // как в оригинале: примерно раз в 5 минут
  var DISCORD_URL = "https://discord.gg/phRQ59Pmp";

  function norm(text) {
    return (text || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // --- Мобильное меню -------------------------------------------------------
  var menuButton = document.querySelector(".menu-toggle");
  var nav = document.querySelector(".main-nav");
  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        menuButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  // --- Главная: кнопка «Начать играть» -> секция «Первые шаги» -------------
  var playButton = document.querySelector(".hero-actions .button.primary");
  var startSection = document.getElementById("start");
  if (playButton && startSection) {
    playButton.addEventListener("click", function () {
      startSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // --- Главная: копирование IP сервера -------------------------------------
  var addressButton = document.querySelector(".server-address");
  if (addressButton) {
    var label = addressButton.querySelector("small");
    var originalLabel = label ? label.textContent : "";
    var resetTimer = null;

    var showCopied = function (text) {
      if (!label) return;
      label.textContent = text;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () {
        label.textContent = originalLabel;
      }, 1800);
    };

    var fallbackCopy = function () {
      var area = document.createElement("textarea");
      area.value = SERVER_IP;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(area);
      return ok;
    };

    addressButton.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(SERVER_IP).then(
          function () { showCopied("СКОПИРОВАНО"); },
          function () { showCopied(fallbackCopy() ? "СКОПИРОВАНО" : "НЕ УДАЛОСЬ"); }
        );
      } else {
        showCopied(fallbackCopy() ? "СКОПИРОВАНО" : "НЕ УДАЛОСЬ");
      }
    });
  }

  // --- Главная: индикатор онлайна ------------------------------------------
  var dot = document.querySelector(".server-status-dot");
  var counter = document.querySelector(".server-online");

  function setStatus(state, text) {
    if (dot) dot.className = "server-status-dot is-" + state;
    if (counter) counter.textContent = text;
  }

  function loadStatus() {
    fetch(STATUS_URL, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (data) {
        if (data && data.online) {
          var players = data.players && typeof data.players.online === "number" ? data.players.online : 0;
          setStatus("online", "ОНЛАЙН: " + players);
        } else {
          setStatus("unavailable", "СЕРВЕР ОФФЛАЙН");
        }
      })
      .catch(function () {
        setStatus("unavailable", "СТАТУС НЕДОСТУПЕН");
      });
  }

  if (dot && counter) {
    loadStatus();
    setInterval(loadStatus, STATUS_REFRESH_MS);
  }

  // --- Правила: поиск по тексту --------------------------------------------
  var rulesInput = document.querySelector(".rules-search input");
  var rulesContent = document.querySelector(".rules-content");
  if (rulesInput && rulesContent) {
    var articles = Array.prototype.slice.call(rulesContent.querySelectorAll("article"));
    var tocLinks = {};
    Array.prototype.forEach.call(document.querySelectorAll(".rules-toc a"), function (link) {
      tocLinks[link.getAttribute("href").slice(1)] = link;
    });
    var emptyRules = el("p", "empty", "По вашему запросу ничего не найдено.");
    emptyRules.hidden = true;
    rulesContent.insertBefore(emptyRules, rulesContent.querySelector(".info-panel"));

    rulesInput.addEventListener("input", function () {
      var query = norm(rulesInput.value);
      var shown = 0;
      articles.forEach(function (article) {
        var match = !query || norm(article.textContent).indexOf(query) !== -1;
        article.hidden = !match;
        if (tocLinks[article.id]) tocLinks[article.id].hidden = !match;
        if (match) shown += 1;
      });
      emptyRules.hidden = shown !== 0;
    });
  }

  // --- Магазин: поиск и окно товара ----------------------------------------
  var shopGrid = document.querySelector(".product-grid");
  if (shopGrid) {
    var cards = Array.prototype.slice.call(shopGrid.querySelectorAll(".product-card"));
    var shopInput = document.querySelector(".shop-toolbar .search input");
    var emptyShop = el("p", "empty", "Ничего не найдено.");
    emptyShop.hidden = true;
    shopGrid.parentNode.insertBefore(emptyShop, shopGrid.nextSibling);

    if (shopInput) {
      shopInput.addEventListener("input", function () {
        var query = norm(shopInput.value);
        var shown = 0;
        cards.forEach(function (card) {
          var match = !query || norm(card.textContent).indexOf(query) !== -1;
          card.hidden = !match;
          if (match) shown += 1;
        });
        emptyShop.hidden = shown !== 0;
      });
    }

    var modalRoot = null;
    var modalOpener = null;

    var closeModal = function () {
      if (!modalRoot) return;
      document.body.removeChild(modalRoot);
      modalRoot = null;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onModalKey);
      if (modalOpener) modalOpener.focus();
    };

    var onModalKey = function (e) {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "Tab" && modalRoot) {
        var items = modalRoot.querySelectorAll("button, a[href]");
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    var openModal = function (card) {
      var tones = ["pink", "purple", "green", "orange", "blue"];
      var tone = tones.filter(function (t) { return card.classList.contains(t); })[0] || "";
      var iconSource = card.querySelector(".product-art svg");
      var priceSource = card.querySelector(".product-bottom > span");

      var backdrop = el("div", "modal-backdrop");
      var modal = el("div", "modal");
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");

      var close = el("button", "modal-close", "✕");
      close.type = "button";
      close.setAttribute("aria-label", "Закрыть");

      var icon = el("span", "feature-icon " + tone);
      if (iconSource) {
        var clone = iconSource.cloneNode(true);
        clone.setAttribute("width", "24");
        clone.setAttribute("height", "24");
        icon.appendChild(clone);
      }

      var title = el("h2", "", card.querySelector(".product-name").textContent);
      title.id = "product-modal-title";
      modal.setAttribute("aria-labelledby", title.id);

      var price = el("div", "modal-price", priceSource ? priceSource.textContent.replace(/\s+/g, " ").trim() : "");
      var notice = el("p", "notice", "Витрина · покупки пока недоступны");
      var cta = el("a", "button primary", "Написать в Discord");
      cta.href = DISCORD_URL;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";

      modal.appendChild(close);
      modal.appendChild(icon);
      modal.appendChild(el("span", "eyebrow", card.querySelector(".product-type").textContent));
      modal.appendChild(title);
      modal.appendChild(price);
      modal.appendChild(notice);
      modal.appendChild(cta);
      backdrop.appendChild(modal);

      backdrop.addEventListener("mousedown", function (e) {
        if (e.target === backdrop) closeModal();
      });
      close.addEventListener("click", closeModal);

      modalOpener = card;
      modalRoot = backdrop;
      document.body.appendChild(backdrop);
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onModalKey);
      close.focus();
    };

    cards.forEach(function (card) {
      card.addEventListener("click", function () { openModal(card); });
    });
  }
})();
