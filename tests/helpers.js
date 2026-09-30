const fs = require("fs");
const path = require("path");
const { expect } = require("@playwright/test");

const MAIL_LOG = path.join(__dirname, ".tmp", "mail.log");

/** Attend que le défilement (y compris le défilement doux) soit terminé. */
async function waitForScrollEnd(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let last = window.scrollY;
        let stable = 0;
        const started = performance.now();
        function tick() {
          if (Math.abs(window.scrollY - last) < 0.5) {
            stable += 1;
          } else {
            stable = 0;
            last = window.scrollY;
          }
          if (stable >= 10 || performance.now() - started > 4000) resolve();
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      })
  );
}

/**
 * Vérifie qu'une section est bien positionnée après une navigation par ancre :
 * défilement attendu (scroll-padding compris), en-tête collant toujours en haut,
 * et haut de la section non masqué par l'en-tête.
 */
async function expectSectionInView(page, id) {
  await waitForScrollEnd(page);
  const r = await page.evaluate((targetId) => {
    const el = document.getElementById(targetId);
    const header = document.querySelector(".site-header");
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const rect = el.getBoundingClientRect();
    const wanted = rect.top + window.scrollY - pad;
    return {
      scrollY: window.scrollY,
      expected: Math.max(0, Math.min(wanted, maxScroll)),
      top: rect.top,
      headerTop: header.getBoundingClientRect().top,
      headerBottom: header.getBoundingClientRect().bottom,
    };
  }, id);
  expect(Math.abs(r.scrollY - r.expected), `défilement vers #${id}`).toBeLessThanOrEqual(2);
  expect(r.headerTop, "en-tête collant en haut").toBe(0);
  expect(r.top, `#${id} non masqué par l'en-tête`).toBeGreaterThanOrEqual(r.headerBottom - 1);
}

/** Supprime les espaces insécables pour comparer des montants. */
function plain(text) {
  return (text || "").replace(/[  ]/g, " ").trim();
}

function readMailLog() {
  return fs.existsSync(MAIL_LOG) ? fs.readFileSync(MAIL_LOG, "utf8") : "";
}

/** Renvoie le bloc d'e-mail qui contient le marqueur, ou null. */
function findMail(marker) {
  const blocks = readMailLog().split("=== MAIL ");
  return blocks.find((b) => b.includes(marker)) || null;
}

/** Collecte les erreurs console, erreurs JS et requêtes en échec d'une page. */
function watchErrors(page) {
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`js: ${e.message}`));
  page.on("requestfailed", (r) => errors.push(`échec: ${r.url()}`));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  return errors;
}

module.exports = { waitForScrollEnd, expectSectionInView, plain, readMailLog, findMail, watchErrors };
