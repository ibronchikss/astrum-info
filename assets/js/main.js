/*
 * ASTRUM — минимальный скрипт для статичной копии сайта.
 * Оригинальный JS (Next.js/React) получить не удалось, поэтому поведение ниже
 * воссоздано по разметке:
 *   - сжатие шапки при прокрутке, мобильное меню, копирование IP, кнопка «Начать играть», индикатор онлайна;
 *   - смена двух скриншотов на главной раз в 5 секунд;
 *   - переключатель светлой/тёмной темы (запоминается в localStorage);
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

  // --- Шапка: при прокрутке сжимается в закруглённую «капсулу» (стили — extra.css) --
  var siteHeader = document.querySelector(".site-header");
  if (siteHeader) {
    var headerTicking = false;
    var updateHeader = function (instant) {
      headerTicking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var shrunk = siteHeader.classList.contains("is-scrolled");
      // небольшой гистерезис, чтобы шапка не «дрожала» на границе
      var want = shrunk ? y > 8 : y > 32;
      if (want === shrunk) return;
      if (instant === true) {
        siteHeader.style.transition = "none";
        siteHeader.classList.toggle("is-scrolled", want);
        void siteHeader.offsetWidth;
        siteHeader.style.transition = "";
      } else {
        siteHeader.classList.toggle("is-scrolled", want);
      }
    };
    window.addEventListener("scroll", function () {
      if (!headerTicking) {
        headerTicking = true;
        window.requestAnimationFrame(updateHeader);
      }
    }, { passive: true });
    updateHeader(true); // страница могла открыться уже прокрученной (перезагрузка, переход по якорю)
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

  // --- Тема: светлая / тёмная (выбор запоминается; начальную тему ставит скрипт в <head>) ---
  var themeButton = document.querySelector(".theme-toggle");
  if (themeButton) {
    var htmlRoot = document.documentElement;
    var currentTheme = function () {
      return htmlRoot.getAttribute("data-theme") === "light" ? "light" : "dark";
    };
    var syncThemeButton = function () {
      var light = currentTheme() === "light";
      themeButton.setAttribute("aria-pressed", light ? "true" : "false");
      themeButton.title = light ? "Включить тёмную тему" : "Включить светлую тему";
    };
    var animTimer = null;
    themeButton.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      htmlRoot.classList.add("theme-anim"); // плавная смена цветов на 0,4 с
      htmlRoot.setAttribute("data-theme", next);
      try { localStorage.setItem("astrum-theme", next); } catch (err) { /* режим без хранилища */ }
      syncThemeButton();
      clearTimeout(animTimer);
      animTimer = setTimeout(function () { htmlRoot.classList.remove("theme-anim"); }, 450);
    });
    syncThemeButton();
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

  // --- Главная: полоски в «Вопросах» плавно заполняются, когда блок виден -----
  var faqSection = document.querySelector(".faq");
  if (faqSection) {
    var showFaq = function () { faqSection.classList.add("faq-in"); };
    var reduceFaq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceFaq || !("IntersectionObserver" in window)) {
      showFaq();
    } else {
      faqSection.classList.add("faq-ready");
      var faqObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          showFaq();
          faqObserver.disconnect();
        }
      }, { threshold: 0.2 });
      faqObserver.observe(faqSection);
    }
  }

  // --- Главная: два скриншота под лентой меняются раз в 5 секунд ----------------
  // Каждый кадр хранит два слоя <img>: новый подгружается под видимым и плавно проявляется.
  // Оба кадра всегда показывают разные картинки, и обе новые отличаются от тех, что были на экране.
  var galleryBoxes = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));
  if (galleryBoxes.length === 2) {
    var SLIDE_EVERY_MS = 5000;
    var SLIDES = [
      { src: "assets/images/slide-castle.webp", alt: "Замок за садом с розами, фонарями и красным флагом" },
      { src: "assets/images/slide-domes.webp", alt: "Бирюзовые купола и каменная стена над зелёной долиной" },
      { src: "assets/images/slide-timber.webp", alt: "Фахверковые дома и цветочные клумбы у лестницы" },
      { src: "assets/images/slide-sunset.webp", alt: "Город Astrum на закате: фахверковые дома и каменная башня над деревьями" },
      { src: "assets/images/slide-crystal.webp", alt: "Дом с розовыми кристаллами и башня с водопадом" }
    ];

    var frames = galleryBoxes.map(function (box) {
      var front = box.querySelector(".gallery-img");
      var back = front.cloneNode(false);
      back.classList.remove("is-active");
      back.alt = "";
      back.removeAttribute("src");
      box.appendChild(back);
      var current = -1;
      SLIDES.forEach(function (slide, i) {
        if (front.getAttribute("src") === slide.src) current = i;
      });
      return { front: front, back: back, index: current };
    });

    var showSlide = function (frame, index) {
      var incoming = frame.back;
      var outgoing = frame.front;
      var done = false;
      frame.index = index;
      var reveal = function () {
        if (done) return;
        done = true;
        incoming.classList.add("is-active");
        outgoing.classList.remove("is-active");
        frame.front = incoming;
        frame.back = outgoing;
      };
      incoming.onload = reveal;
      incoming.onerror = function () { done = true; };
      incoming.alt = SLIDES[index].alt;
      incoming.src = SLIDES[index].src;
      if (incoming.complete && incoming.naturalWidth) reveal();
    };

    var nextSlides = function () {
      var busy = frames.map(function (frame) { return frame.index; });
      var free = [];
      SLIDES.forEach(function (slide, i) {
        if (busy.indexOf(i) === -1) free.push(i);
      });
      for (var i = free.length - 1; i > 0; i--) { // перемешиваем
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = free[i];
        free[i] = free[j];
        free[j] = tmp;
      }
      return free;
    };

    // подгружаем остальные кадры заранее, когда страница уже открылась
    window.addEventListener("load", function () {
      setTimeout(function () {
        SLIDES.forEach(function (slide) { new Image().src = slide.src; });
      }, 800);
    });

    setInterval(function () {
      if (document.hidden) return;
      var pick = nextSlides();
      if (pick.length < 2) return;
      showSlide(frames[0], pick[0]);
      setTimeout(function () { showSlide(frames[1], pick[1]); }, 450);
    }, SLIDE_EVERY_MS);
  }

  // --- Правила: поиск по пунктам и подсветка раздела в содержании -----------
  var rulesInput = document.querySelector(".rules-search input");
  var rulesContent = document.querySelector(".rules-content");
  if (rulesInput && rulesContent) {
    var articles = Array.prototype.slice.call(rulesContent.querySelectorAll("article"));
    var rulesIntro = document.getElementById("rules-intro");
    var tocLinks = {};
    Array.prototype.forEach.call(document.querySelectorAll(".rules-toc a"), function (link) {
      tocLinks[link.getAttribute("href").slice(1)] = link;
    });
    var activePenalty = "";
    var penaltyButtons = Array.prototype.slice.call(document.querySelectorAll(".rule-legend [data-penalty]"));
    var showAllButton = document.getElementById("rules-show-all");
    var emptyRules = el("p", "empty", "По вашему запросу ничего не найдено.");
    emptyRules.hidden = true;
    rulesContent.insertBefore(emptyRules, rulesContent.querySelector(".info-panel"));

    penaltyButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var chosen = button.getAttribute("data-penalty");
        activePenalty = activePenalty === chosen ? "" : chosen;
        penaltyButtons.forEach(function (item) {
          var selected = item.getAttribute("data-penalty") === activePenalty;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-pressed", selected ? "true" : "false");
        });
        rulesContent.classList.toggle("penalty-filter-active", !!activePenalty);
        if (showAllButton) showAllButton.hidden = !activePenalty;
        rulesInput.dispatchEvent(new Event("input", { bubbles: true }));
        if (activePenalty) rulesContent.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (showAllButton) {
      showAllButton.addEventListener("click", function () {
        activePenalty = "";
        rulesInput.value = "";
        penaltyButtons.forEach(function (item) {
          item.classList.remove("is-selected");
          item.setAttribute("aria-pressed", "false");
        });
        rulesContent.classList.remove("penalty-filter-active");
        showAllButton.hidden = true;
        rulesInput.dispatchEvent(new Event("input", { bubbles: true }));
        rulesIntro.hidden = false;
        rulesContent.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    rulesInput.addEventListener("input", function () {
      var query = norm(rulesInput.value);
      var shown = 0;
      if (rulesIntro) rulesIntro.hidden = !!query || !!activePenalty;
      if (showAllButton) showAllButton.hidden = !activePenalty;
      rulesContent.classList.toggle("penalty-filter-active", !!activePenalty);
      articles.forEach(function (article) {
        var units = Array.prototype.slice.call(article.querySelectorAll("[data-item]"));
        var titleHit = !!query && norm(article.querySelector("h2").textContent).indexOf(query) !== -1;
        var any = false;
        units.forEach(function (unit) {
          var textHit = !query || titleHit || norm(unit.textContent).indexOf(query) !== -1;
          var penaltyHit = !activePenalty || !!unit.querySelector("." + activePenalty);
          var hit = textHit && penaltyHit;
          unit.hidden = !hit;
          if (hit) any = true;
        });
        // в блоках без пунктов (например, карточки законопроектов) раздел виден, если есть совпадение в заголовке
        var visible = activePenalty ? any : (!query || any);
        article.hidden = !visible;
        if (activePenalty) {
          var head = article.querySelector(".rule-head");
          if (head) head.hidden = true;
        } else {
          var head = article.querySelector(".rule-head");
          if (head) head.hidden = false;
        }
        if (tocLinks[article.id]) tocLinks[article.id].hidden = !visible;
        if (visible) shown += 1;
      });
      emptyRules.hidden = shown !== 0;
      var infoPanel = rulesContent.querySelector(".info-panel");
      if (infoPanel) infoPanel.hidden = !!activePenalty;
      var lawProjects = rulesContent.querySelector(".law-projects");
      if (lawProjects) lawProjects.hidden = !!activePenalty;
    });

    // в содержании подсвечивается раздел, который сейчас на экране
    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          Object.keys(tocLinks).forEach(function (id) {
            tocLinks[id].classList.toggle("is-active", id === entry.target.id);
          });
        });
      }, { rootMargin: "-20% 0px -70% 0px" });
      articles.forEach(function (article) { spy.observe(article); });
    }
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
