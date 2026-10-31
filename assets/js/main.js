/*
 * ASTRUM — минимальный скрипт для статичной копии сайта.
 * Оригинальный JS (Next.js/React) получить не удалось, поэтому поведение ниже
 * воссоздано по разметке:
 *   - мобильное меню, копирование IP, кнопка «Начать играть», индикатор онлайна;
 *   - поиск по правилам;
 *   - магазин: вкладки категорий, поиск по товарам и окно товара (тексты берутся из
 *     <template> в shop.html, покупка ведёт в магазин shop.astrums.pro).
 * Всё, что здесь описано, — реконструкция, а не копия оригинального кода.
 */
(function () {
  "use strict";

  var SERVER_IP = "astrums.pro";
  var STATUS_URL = "https://api.mcsrvstat.us/3/" + SERVER_IP;
  var STATUS_REFRESH_MS = 5 * 60 * 1000; // как в оригинале: примерно раз в 5 минут

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

  // --- Магазин: категории, поиск и окно товара -----------------------------
  var shopGrid = document.querySelector(".product-grid");
  if (shopGrid) {
    var STORE_URL = "https://shop.astrums.pro/";
    var cards = Array.prototype.slice.call(shopGrid.querySelectorAll(".product-card"));
    var shopInput = document.querySelector(".shop-toolbar .search input");
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".shop-tab"));
    var emptyShop = el("p", "empty", "Ничего не найдено.");
    emptyShop.hidden = true;
    shopGrid.parentNode.insertBefore(emptyShop, shopGrid.nextSibling);

    // В поиск входит и описание товара (текст из <template>), а не только карточка.
    var haystack = {};
    cards.forEach(function (card) {
      var tpl = document.getElementById("product-" + card.getAttribute("data-product"));
      haystack[card.getAttribute("data-product")] = norm(card.textContent + " " + (tpl ? tpl.content.textContent : ""));
    });

    var activeFilter = "all";
    var applyShopFilters = function () {
      var query = norm(shopInput ? shopInput.value : "");
      var shown = 0;
      cards.forEach(function (card) {
        var inCategory = activeFilter === "all" || card.getAttribute("data-category") === activeFilter;
        var matches = !query || haystack[card.getAttribute("data-product")].indexOf(query) !== -1;
        card.hidden = !(inCategory && matches);
        if (inCategory && matches) shown += 1;
      });
      emptyShop.hidden = shown !== 0;
    };

    if (shopInput) shopInput.addEventListener("input", applyShopFilters);
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activeFilter = tab.getAttribute("data-filter");
        tabs.forEach(function (other) {
          var on = other === tab;
          other.classList.toggle("is-active", on);
          other.setAttribute("aria-pressed", on ? "true" : "false");
        });
        applyShopFilters();
      });
    });

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
      var template = document.getElementById("product-" + card.getAttribute("data-product"));
      var cardImage = card.querySelector(".product-art img");
      var priceText = card.getAttribute("data-price");

      var backdrop = el("div", "modal-backdrop");
      var modal = el("div", "modal is-product");
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");

      var close = el("button", "modal-close", "✕");
      close.type = "button";
      close.setAttribute("aria-label", "Закрыть");

      var head = el("div", "modal-head");
      if (cardImage) {
        var thumb = el("span", "modal-thumb");
        var thumbImage = el("img");
        thumbImage.src = cardImage.getAttribute("src");
        thumbImage.alt = "";
        thumb.appendChild(thumbImage);
        head.appendChild(thumb);
      }
      var titleBox = el("div");
      var title = el("h2", "", card.querySelector(".product-name").textContent);
      title.id = "product-modal-title";
      modal.setAttribute("aria-labelledby", title.id);
      titleBox.appendChild(el("span", "eyebrow", card.querySelector(".product-type").textContent));
      titleBox.appendChild(title);
      head.appendChild(titleBox);

      var price = el("div", "modal-price" + (priceText ? "" : " is-muted"), priceText || "Цена — в магазине");

      var body = el("div", "modal-body");
      if (template) body.appendChild(template.content.cloneNode(true));

      var note = el("p", "subtle-note", "Оплата и выдача — в магазине shop.astrums.pro");
      var cta = el("a", "button primary", "Купить в магазине");
      cta.href = STORE_URL;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";

      modal.appendChild(close);
      modal.appendChild(head);
      modal.appendChild(price);
      modal.appendChild(body);
      modal.appendChild(note);
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
