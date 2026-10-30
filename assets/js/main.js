/*
 * ASTRUM — минимальный скрипт для статичной копии сайта.
 * Оригинальный JS (Next.js/React) получить не удалось, поэтому поведение ниже
 * воссоздано по разметке: мобильное меню, копирование IP, кнопка «Начать играть»
 * и индикатор онлайна.
 */
(function () {
  "use strict";

  var SERVER_IP = "astrums.pro";
  var STATUS_URL = "https://api.mcsrvstat.us/3/" + SERVER_IP;
  var STATUS_REFRESH_MS = 5 * 60 * 1000; // как в оригинале: примерно раз в 5 минут

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

  // --- Кнопка «Начать играть» -> секция «Первые шаги» ----------------------
  var playButton = document.querySelector(".hero-actions .button.primary");
  var startSection = document.getElementById("start");
  if (playButton && startSection) {
    playButton.addEventListener("click", function () {
      startSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // --- Копирование IP сервера ----------------------------------------------
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

  // --- Индикатор онлайна ----------------------------------------------------
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
})();
