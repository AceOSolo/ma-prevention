/* ma-prevention.fr : interactions de la page (sans dépendance). */
(function () {
  "use strict";

  var PRIX_PACK = 300;
  var TAUX_EDITEUR = 0.6;

  function formatEuros(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0€";
  }

  /* Menu mobile */
  function initMenu() {
    var toggle = document.querySelector(".nav-toggle");
    var menu = document.getElementById("mobile-nav");
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      menu.hidden = !open;
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 1100px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* Aperçu de la marque dans le navigateur du hero */
  function initBrandPreview() {
    var input = document.getElementById("brand-input");
    if (!input) return;
    var slugEl = document.querySelector(".js-slug");
    var logoEl = document.querySelector(".js-brand-logo");
    var assistantEl = document.querySelector(".js-assistant");

    function slugify(value) {
      return value
        .toLowerCase()
        .replace(/œ/g, "oe")
        .replace(/æ/g, "ae")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
    }

    input.addEventListener("input", function () {
      var name = input.value.trim();
      slugEl.textContent = slugify(name) || "votre-marque";
      logoEl.textContent = name ? name.toUpperCase().slice(0, 22) : "VOTRE LOGO";
      assistantEl.textContent = name ? name.slice(0, 22) : "Flex";
    });
  }

  /* Estimation de la marge */
  function initSimulator() {
    var range = document.getElementById("sim-packs");
    if (!range) return;
    var count = document.getElementById("sim-count");
    var ca = document.getElementById("sim-ca");
    var refac = document.getElementById("sim-refac");
    var marge = document.getElementById("sim-marge");

    function update() {
      var packs = Number(range.value) || 0;
      var total = packs * PRIX_PACK;
      count.textContent = String(packs);
      ca.textContent = formatEuros(total);
      refac.textContent = formatEuros(total * TAUX_EDITEUR);
      marge.textContent = formatEuros(total * (1 - TAUX_EDITEUR));
      range.setAttribute("aria-valuetext", packs + " packs par an");
      var max = Number(range.max) || 1;
      range.style.setProperty("--fill", (packs / max) * 100 + "%");
    }

    range.addEventListener("input", update);
    update();
  }

  /* Places early bird : modifier data-places sur <body> dans index.html */
  function initPlaces() {
    var places = parseInt(document.body.getAttribute("data-places"), 10);
    if (isNaN(places)) return;
    var label = places > 1
      ? "Encore " + places + " places disponibles"
      : "Encore 1 place disponible";

    document.querySelectorAll(".js-places").forEach(function (el) {
      if (places <= 0) {
        el.hidden = true;
      } else {
        el.textContent = label;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMenu();
    initBrandPreview();
    initSimulator();
    initPlaces();
  });
})();
