/* ma-prevention.fr : interactions de la page (sans dépendance). */
(function () {
  "use strict";

  var PRIX_PACK = 300;
  var TAUX_EDITEUR = 0.6;
  /* Remises volume : 1er pack au prix catalogue, puis -20 %, -30 %, -40 %, -50 % dès le 5e. */
  var REMISES = [0, 0.2, 0.3, 0.4, 0.5];
  /* Pack Pilotage et plan d'actions offert à partir de ce nombre de packs achetés. */
  var SEUIL_PILOTAGE = 3;

  function formatEuros(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
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
    window.matchMedia("(min-width: 1200px)").addEventListener("change", function (mq) {
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
      assistantEl.textContent = name ? name.slice(0, 22) : "IA";
    });
  }

  /* Onglets : profils de distributeurs et captures d'écran.
     Sans JavaScript, la liste d'onglets reste masquée et tous les panneaux restent visibles. */
  function initTabs(root) {
    var tablist = root.querySelector('[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    });

    function select(index, focus) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    }

    panels.forEach(function (panel, i) {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabs[i].id);
      panel.tabIndex = 0;
    });
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(i, false); });
      tab.addEventListener("keydown", function (e) {
        var n = tabs.length;
        var next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        select(next, true);
      });
    });

    var current = tabs.findIndex(function (tab) { return tab.getAttribute("aria-selected") === "true"; });
    select(Math.max(0, current), false);
    tablist.hidden = false;
  }

  /* Liens qui ouvrent un onglet précis avant de défiler jusqu'à sa section */
  function initTabLinks() {
    document.querySelectorAll("[data-tab-target]").forEach(function (link) {
      link.addEventListener("click", function () {
        var tab = document.querySelector('[role="tab"][aria-controls="' + link.getAttribute("data-tab-target") + '"]');
        if (tab) tab.click();
      });
    });
  }

  /* Remises volume : total d'un achat groupé de packs */
  function initVolume() {
    var group = document.querySelector(".js-volume");
    if (!group) return;
    var buttons = group.querySelectorAll("button[data-packs]");
    var stairs = document.querySelectorAll(".stair");
    var caseEl = document.querySelector(".js-volume-case");
    var catalogueEl = document.querySelector(".js-volume-catalogue");
    var remiseEl = document.querySelector(".js-volume-remise");
    var totalEl = document.querySelector(".js-volume-total");
    var giftEl = document.querySelector(".js-volume-gift");

    function update(packs) {
      var catalogue = packs * PRIX_PACK;
      var total = 0;
      for (var i = 0; i < packs; i++) {
        total += PRIX_PACK * (1 - REMISES[Math.min(i, REMISES.length - 1)]);
      }
      var remise = catalogue - total;
      caseEl.textContent = "Pour " + packs + (packs > 1 ? " packs achetés ensemble" : " pack acheté seul");
      catalogueEl.textContent = formatEuros(catalogue);
      remiseEl.textContent = remise > 0 ? "−" + formatEuros(remise) : formatEuros(0);
      totalEl.textContent = formatEuros(total) + " HT";
      giftEl.textContent = packs >= SEUIL_PILOTAGE
        ? "Offerts en plus : Pilotage et plan d'actions, Effectifs et compétences."
        : "Offert en plus : Effectifs et compétences. Pilotage et plan d'actions offert dès " + SEUIL_PILOTAGE + " packs.";
      stairs.forEach(function (stair, i) { stair.classList.toggle("is-on", i < packs); });
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-packs")) === packs));
      });
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { update(Number(b.getAttribute("data-packs"))); });
    });
    update(SEUIL_PILOTAGE);
    group.hidden = false;
  }

  /* Exemple de marque blanche : la même plateforme avec le thème par défaut ou votre couleur.
     Règles de la charte : texte blanc sur la couleur dès 4,5:1, sinon foncé ;
     liens et repères assombris jusqu'à 4,5:1 sur fond blanc. */
  var BLANC = "#ffffff";
  var NUIT = "#1e1030";

  function rgb(hex) {
    var h = hex.replace("#", "");
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); });
  }
  function luminance(hex) {
    var c = rgb(hex).map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contraste(a, b) {
    var x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function toHex(c) {
    return "#" + c.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join("");
  }
  function assombrir(couleur, cible) {
    var c = rgb(couleur), k = 1, hex = couleur.toLowerCase();
    while (contraste(hex, BLANC) < cible && k > 0) {
      k -= 0.01;
      hex = toHex(c.map(function (v) { return v * k; }));
    }
    return hex;
  }
  function couleursMarque(couleur) {
    var surBlanc = contraste(BLANC, couleur), surNuit = contraste(NUIT, couleur);
    var texteBlanc = surBlanc >= 4.5 || surBlanc >= surNuit;
    return {
      sur: texteBlanc ? BLANC : NUIT,
      ratio: texteBlanc ? surBlanc : surNuit,
      texteBlanc: texteBlanc,
      reperes: assombrir(couleur, 4.5),
    };
  }
  function ratio(r) {
    return r.toFixed(1).replace(".", ",") + ":1";
  }

  function initThemeDemo() {
    var group = document.querySelector(".js-theme-switch");
    var app = document.querySelector(".js-app");
    if (!group || !app) return;
    var rule = document.querySelector(".js-theme-rule");
    var picker = document.getElementById("theme-color");
    var custom = group.querySelector(".theme-switch__custom");
    var buttons = group.querySelectorAll("button[data-theme]");
    var brandInput = document.getElementById("brand-input");
    var persoName = app.querySelector(".app__brand--perso");
    var THEMES = {
      defaut: { couleur: "#6a18c2", nom: "Avec le violet Ma-prevention, thème par défaut,", aria: "avec le thème par défaut" },
      perso: { nom: "Avec votre couleur", aria: "avec votre couleur" },
    };

    function nomPerso() {
      var name = brandInput ? brandInput.value.trim().slice(0, 22) : "";
      return name || "Votre marque";
    }
    function majPerso() {
      var name = nomPerso();
      persoName.textContent = "";
      var initiale = document.createElement("span");
      initiale.className = "app__initiale";
      initiale.textContent = name.charAt(0).toUpperCase();
      persoName.appendChild(initiale);
      persoName.appendChild(document.createTextNode(name));
    }

    function apply(theme) {
      var couleur = theme === "perso" ? picker.value : THEMES[theme].couleur;
      var c = couleursMarque(couleur);
      app.style.setProperty("--mb", couleur);
      app.style.setProperty("--mb-sur", c.sur);
      app.style.setProperty("--mb-texte", c.reperes);
      ["defaut", "perso"].forEach(function (t) {
        app.querySelector(".app__brand--" + t).hidden = t !== theme;
      });
      if (theme === "perso") majPerso();
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-theme") === theme));
      });
      custom.classList.toggle("is-active", theme === "perso");
      app.setAttribute("aria-label", "Aperçu de la plateforme Ma-prevention " + THEMES[theme].aria + " : document unique avec quatre risques cotés");

      var phrase = THEMES[theme].nom + ", la plateforme écrit les boutons en " +
        (c.texteBlanc ? "blanc" : "foncé") + " pour rester lisible (contraste " + ratio(c.ratio) + ").";
      if (c.reperes !== couleur.toLowerCase()) {
        phrase += " Les repères passent en " + c.reperes + " sur fond blanc.";
      }
      rule.textContent = phrase + " Les couleurs de cotation sont les mêmes pour toutes les marques.";
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-theme")); });
    });
    picker.addEventListener("input", function () { apply("perso"); });
    if (brandInput) {
      brandInput.addEventListener("input", function () {
        if (custom.classList.contains("is-active")) majPerso();
      });
    }
    group.hidden = false;
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
    document.querySelectorAll(".js-tabs").forEach(initTabs);
    initTabLinks();
    initThemeDemo();
    initVolume();
    initSimulator();
    initPlaces();
  });
})();
