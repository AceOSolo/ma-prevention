// Tests fonctionnels de la page : liens, boutons, défilement, interactions, formulaire.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const { waitForScrollEnd, expectSectionInView, plain, findMail, watchErrors } = require("./helpers");

const isMobile = (testInfo) => testInfo.project.name === "mobile";

test.describe("Chargement", () => {
  test("la page se charge sans erreur ni ressource manquante", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/SECUSOFT en marque blanche/);

    const images = await page.$$eval("img", (imgs) =>
      imgs.map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute("alt") }))
    );
    for (const img of images) {
      expect(img.ok, `image chargée : ${img.src}`).toBe(true);
      expect(img.alt, `texte alternatif : ${img.src}`).toBeTruthy();
    }

    const rubik = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].some((f) => f.family.includes("Rubik") && f.status === "loaded");
    });
    expect(rubik, "police Rubik chargée").toBe(true);
    expect(errors).toEqual([]);
  });

  for (const url of ["/mentions-legales.html", "/merci.html", "/404.html"]) {
    test(`page annexe ${url} sans erreur`, async ({ page }) => {
      const errors = watchErrors(page);
      const res = await page.goto(url);
      expect(res.status()).toBe(200);
      await page.waitForLoadState("networkidle");
      const broken = await page.$$eval("img", (imgs) => imgs.filter((i) => !(i.complete && i.naturalWidth > 0)).map((i) => i.src));
      expect(broken).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

test.describe("Liens et boutons", () => {
  test("chaque ancre interne mène à une section existante", async ({ page }) => {
    await page.goto("/");
    const missing = await page.$$eval('a[href^="#"]', (links) =>
      links
        .map((a) => a.getAttribute("href"))
        .filter((h) => h.length < 2 || !document.getElementById(h.slice(1)))
    );
    expect(missing).toEqual([]);
  });

  test("tous les éléments cliquables visibles répondent au clic", async ({ page }) => {
    await page.goto("/");
    const clickables = page.locator(
      "a:visible, button:visible, summary:visible, input:visible, select:visible, textarea:visible"
    );
    const count = await clickables.count();
    expect(count).toBeGreaterThan(30);
    const blocked = [];
    for (let i = 0; i < count; i++) {
      const el = clickables.nth(i);
      const info = await el.evaluate((n) => ({
        skip: n.classList.contains("skip-link") || !!n.closest(".hp"),
        label: `${n.tagName.toLowerCase()} ${n.id ? "#" + n.id : ""} ${(n.textContent || n.getAttribute("href") || "").trim().slice(0, 40)}`,
      }));
      if (info.skip) continue;
      try {
        await el.click({ trial: true, timeout: 3000 });
      } catch (e) {
        blocked.push(info.label);
      }
    }
    expect(blocked, "éléments non cliquables (masqués ou recouverts)").toEqual([]);
  });

  test("liens de contact et liens externes au bon format", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    const tel = hrefs.filter((h) => h.startsWith("tel:"));
    const mail = hrefs.filter((h) => h.startsWith("mailto:"));
    const ext = hrefs.filter((h) => /^https?:/.test(h));
    expect(tel.length).toBeGreaterThan(0);
    expect(new Set(tel)).toEqual(new Set(["tel:+33950276188"]));
    expect(new Set(mail)).toEqual(new Set(["mailto:contact@secutop.fr"]));
    for (const h of ext) expect(h).toMatch(/^https:\/\//);
    expect(hrefs.filter((h) => h === "" || h === "#")).toEqual([]);
  });

  test("navigation principale (desktop) : chaque lien amène à sa section", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "menu desktop");
    await page.goto("/");
    const links = page.locator(".site-nav a");
    await expect(links).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      const href = await links.nth(i).getAttribute("href");
      await links.nth(i).click();
      await expect(page).toHaveURL(new RegExp(href + "$"));
      await expectSectionInView(page, href.slice(1));
    }
    await page.locator(".site-header__cta").click();
    await expectSectionInView(page, "contact");
  });

  test("boutons d'action : hero, tarifs, FAQ et pied de page", async ({ page }) => {
    await page.goto("/");
    const cases = [
      [".hero__actions .btn--primary", "contact"],
      [".hero__actions .btn--light", "principe"],
      [".price-card:not(.price-card--featured) .btn", "contact"],
      [".price-card--featured .btn", "contact"],
      ['.faq__head a[href="#contact"]', "contact"],
      ['.site-footer__nav a[href="#principe"]', "principe"],
      ['.site-footer__nav a[href="#tarifs"]', "tarifs"],
      ['.site-footer__nav a[href="#modele"]', "modele"],
      ['.site-footer__nav a[href="#faq"]', "faq"],
    ];
    for (const [selector, id] of cases) {
      const link = page.locator(selector);
      if ((await link.count()) === 0) continue;
      await link.first().click();
      await expectSectionInView(page, id);
    }
    await page.locator(".site-header__logo").click();
    await waitForScrollEnd(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("liens vers les mentions légales et retour", async ({ page }) => {
    await page.goto("/");
    await page.locator('.site-footer__bottom a[href="mentions-legales.html"]').click();
    await expect(page).toHaveURL(/mentions-legales\.html$/);
    await expect(page.locator("h1")).toHaveText("Mentions légales");
    await page.locator('a:has-text("Retour à l\'offre")').click();
    await expect(page).toHaveURL(/\/(index\.html)?$/);

    await page.locator('.site-footer__bottom a[href="mentions-legales.html#donnees"]').click();
    await expect(page).toHaveURL(/mentions-legales\.html#donnees$/);
    await waitForScrollEnd(page);
    const top = await page.locator("#donnees").evaluate((el) => el.getBoundingClientRect().top);
    const headerBottom = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().bottom);
    expect(top).toBeGreaterThanOrEqual(headerBottom - 1);

    await page.goto("/");
    await page.locator('.consent a[href="mentions-legales.html#donnees"]').click();
    await expect(page).toHaveURL(/#donnees$/);
  });

  test("page de confirmation et page 404 : bouton de retour", async ({ page }) => {
    await page.goto("/merci.html");
    await page.locator('a:has-text("Retour à l\'offre")').click();
    await expect(page).toHaveURL(/\/(index\.html)?$/);
    await page.goto("/404.html");
    await page.locator('a:has-text("Voir l\'offre distributeur")').click();
    await expect(page.locator("#hero-title")).toBeVisible();
  });
});

test.describe("Menu mobile", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "menu mobile uniquement");
    await page.goto("/");
  });

  test("ouverture, fermeture et état ARIA", async ({ page }) => {
    const toggle = page.locator(".nav-toggle");
    const menu = page.locator("#mobile-nav");
    await expect(page.locator(".site-nav")).toBeHidden();
    await expect(menu).toBeHidden();
    await toggle.tap();
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAttribute("aria-label", "Fermer le menu");
    await toggle.tap();
    await expect(menu).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("chaque lien du menu ferme le menu et amène à sa section", async ({ page }) => {
    const toggle = page.locator(".nav-toggle");
    const hrefs = await page.$$eval("#mobile-nav a", (as) => as.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBe(7);
    for (const href of hrefs) {
      await toggle.tap();
      await page.locator(`#mobile-nav a[href="${href}"]`).tap();
      await expect(page.locator("#mobile-nav")).toBeHidden();
      await expectSectionInView(page, href.slice(1));
    }
  });

  test("Échap ferme le menu et rend le focus au bouton", async ({ page }) => {
    const toggle = page.locator(".nav-toggle");
    await toggle.click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-nav")).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("le menu se ferme en passant en largeur desktop", async ({ page }) => {
    await page.locator(".nav-toggle").click();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator("#mobile-nav")).toBeHidden();
    await expect(page.locator(".site-nav")).toBeVisible();
    await expect(page.locator(".nav-toggle")).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("Défilement", () => {
  test("accès direct par URL avec ancre", async ({ page }) => {
    for (const id of ["tarifs", "faq", "contact"]) {
      await page.goto(`/#${id}`);
      await page.waitForLoadState("networkidle");
      await expectSectionInView(page, id);
    }
  });

  test("l'en-tête reste visible en haut pendant tout le défilement", async ({ page }) => {
    await page.goto("/");
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += 1200) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      const top = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBe(0);
    }
  });

  test("défilement molette et clavier jusqu'en bas puis retour en haut", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "molette et touches Fin/Début sur desktop");
    await page.goto("/");
    await page.mouse.move(700, 450);
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 1500);
    await waitForScrollEnd(page);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before);

    await page.locator("body").focus();
    await page.keyboard.press("End");
    await waitForScrollEnd(page);
    const atBottom = await page.evaluate(() => Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) <= 2);
    expect(atBottom).toBe(true);
    await expect(page.locator(".site-footer")).toBeInViewport();

    await page.keyboard.press("Home");
    await waitForScrollEnd(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("défilement tactile (glisser) sur mobile", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "mobile uniquement");
    await page.goto("/");
    const client = await page.context().newCDPSession(page);
    await client.send("Input.synthesizeScrollGesture", { x: 200, y: 600, yDistance: -1200, speed: 2000 });
    await waitForScrollEnd(page);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(800);
  });

  test("défilement doux activé, désactivé si mouvement réduit demandé", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("smooth");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  });

  test("aucun défilement horizontal de 320 à 1920 px", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "boucle de largeurs lancée une fois");
    await page.goto("/");
    for (const width of [320, 360, 375, 390, 414, 600, 768, 900, 1024, 1100, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `débordement à ${width}px`).toBeLessThanOrEqual(0);
    }
  });
});

test.describe("Aperçu de la marque", () => {
  const cases = [
    ["Prévention Rhône-Alpes", "prevention-rhone-alpes", "PRÉVENTION RHÔNE-ALPES", "Prévention Rhône-Alpes"],
    ["  Mon Réseau & Co  ", "mon-reseau-co", "MON RÉSEAU & CO", "Mon Réseau & Co"],
    ["Cœur Santé", "coeur-sante", "CŒUR SANTÉ", "Cœur Santé"],
    ["!!!", "votre-marque", "!!!", "!!!"],
    ["", "votre-marque", "VOTRE LOGO", "Flex"],
  ];

  for (const [input, slug, logo, assistant] of cases) {
    test(`saisie « ${input} »`, async ({ page }) => {
      await page.goto("/");
      await page.locator("#brand-input").fill(input);
      await expect(page.locator(".js-slug")).toHaveText(slug);
      await expect(page.locator(".js-brand-logo")).toHaveText(logo);
      await expect(page.locator(".js-assistant")).toHaveText(assistant);
    });
  }

  test("saisie longue tronquée et effacement", async ({ page }) => {
    await page.goto("/");
    const input = page.locator("#brand-input");
    await input.fill("A".repeat(60));
    expect((await input.inputValue()).length).toBe(40);
    expect((await page.locator(".js-slug").textContent()).length).toBe(32);
    expect((await page.locator(".js-brand-logo").textContent()).length).toBe(22);
    await input.fill("");
    await expect(page.locator(".js-slug")).toHaveText("votre-marque");
  });

  test("le texte saisi n'est jamais interprété comme du HTML", async ({ page }) => {
    let dialog = false;
    page.on("dialog", async (d) => {
      dialog = true;
      await d.dismiss();
    });
    await page.goto("/");
    await page.locator("#brand-input").fill('<img src=x onerror="alert(1)">');
    // Texte affiché tel quel (tronqué à 22 caractères), sans balise créée.
    await expect(page.locator(".js-brand-logo")).toHaveText('<IMG SRC=X ONERROR="AL');
    expect(await page.locator(".browser img").count()).toBe(0);
    expect(dialog).toBe(false);
  });
});

test.describe("Simulateur de marge", () => {
  const values = async (page) => ({
    count: plain(await page.locator("#sim-count").textContent()),
    ca: plain(await page.locator("#sim-ca").textContent()),
    refac: plain(await page.locator("#sim-refac").textContent()),
    marge: plain(await page.locator("#sim-marge").textContent()),
  });

  test("valeurs initiales", async ({ page }) => {
    await page.goto("/");
    expect(await values(page)).toEqual({ count: "25", ca: "7 500 €", refac: "4 500 €", marge: "3 000 €" });
  });

  test("clavier : flèches, Début et Fin", async ({ page }) => {
    await page.goto("/");
    const range = page.locator("#sim-packs");
    await range.focus();
    await page.keyboard.press("ArrowRight");
    expect(await values(page)).toEqual({ count: "30", ca: "9 000 €", refac: "5 400 €", marge: "3 600 €" });
    await page.keyboard.press("End");
    expect(await values(page)).toEqual({ count: "200", ca: "60 000 €", refac: "36 000 €", marge: "24 000 €" });
    await expect(range).toHaveAttribute("aria-valuetext", "200 packs par an");
    expect(await range.evaluate((el) => el.style.getPropertyValue("--fill"))).toBe("100%");
    await page.keyboard.press("Home");
    expect(await values(page)).toEqual({ count: "0", ca: "0 €", refac: "0 €", marge: "0 €" });
  });

  test("souris ou doigt : clic sur la piste", async ({ page }) => {
    await page.goto("/");
    const range = page.locator("#sim-packs");
    await range.scrollIntoViewIfNeeded();
    const box = await range.boundingBox();
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    const v = await values(page);
    const packs = Number(v.count);
    expect(packs).toBeGreaterThanOrEqual(140);
    expect(packs).toBeLessThanOrEqual(160);
    expect(packs % 5).toBe(0);
    expect(v.marge).toBe(`${(packs * 120).toLocaleString("fr-FR").replace(/[  ]/g, " ")} €`);
  });
});

test.describe("FAQ", () => {
  test("chaque question s'ouvre et se referme au clic", async ({ page }) => {
    await page.goto("/");
    const items = page.locator(".faq-item");
    await expect(items).toHaveCount(6);
    await expect(items.first()).toHaveAttribute("open", "");
    for (let i = 0; i < 6; i++) {
      const item = items.nth(i);
      const summary = item.locator("summary");
      const answer = item.locator(".faq-item__answer");
      const wasOpen = await item.evaluate((d) => d.open);
      await summary.click();
      expect(await item.evaluate((d) => d.open)).toBe(!wasOpen);
      if (!wasOpen) await expect(answer).toBeVisible();
      await summary.click();
      expect(await item.evaluate((d) => d.open)).toBe(wasOpen);
    }
  });

  test("ouverture au clavier (Entrée et Espace)", async ({ page }) => {
    await page.goto("/");
    const item = page.locator(".faq-item").nth(2);
    const summary = item.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    expect(await item.evaluate((d) => d.open)).toBe(true);
    await page.keyboard.press("Space");
    expect(await item.evaluate((d) => d.open)).toBe(false);
  });
});

test.describe("Compteur de places early bird", () => {
  async function withPlaces(page, n) {
    await page.route(
      (url) => url.pathname === "/" || url.pathname === "/index.html",
      async (route) => {
        const res = await route.fetch();
        const body = (await res.text()).replace('data-places="20"', `data-places="${n}"`);
        await route.fulfill({ response: res, body });
      }
    );
    await page.goto("/");
  }

  test("20 places par défaut", async ({ page }) => {
    await page.goto("/");
    const places = page.locator(".js-places");
    await expect(places).toHaveCount(3);
    for (const t of await places.allTextContents()) expect(t).toBe("Encore 20 places disponibles");
  });

  test("singulier à 1 place", async ({ page }) => {
    await withPlaces(page, 1);
    for (const t of await page.locator(".js-places").allTextContents()) expect(t).toBe("Encore 1 place disponible");
  });

  test("compteur masqué à 0 place", async ({ page }) => {
    await withPlaces(page, 0);
    const places = page.locator(".js-places");
    for (let i = 0; i < 3; i++) await expect(places.nth(i)).toBeHidden();
  });
});

test.describe("Formulaire de contact", () => {
  async function fillValid(page, org) {
    await page.locator("#f-nom").fill("Jeanne Martin");
    await page.locator("#f-organisation").fill(org);
    await page.locator("#f-email").fill("jeanne.martin@example.com");
    await page.locator("#f-telephone").fill("06 12 34 56 78");
    await page.locator("#f-structure").selectOption("IPRP");
    await page.locator("#f-clients").selectOption("De 50 à 200");
    await page.locator("#f-message").fill("Nous souhaitons proposer SECUSOFT à nos adhérents.");
    await page.locator("#f-consent").check();
  }

  function countPosts(page) {
    const counter = { n: 0 };
    page.on("request", (r) => {
      if (r.url().includes("contact.php") && r.method() === "POST") counter.n += 1;
    });
    return counter;
  }

  test.beforeEach(async ({ page }) => {
    await page.goto("/#contact");
  });

  test("envoi vide bloqué, premier champ en erreur", async ({ page }) => {
    const posts = countPosts(page);
    await page.locator("#contact-form button[type=submit]").click();
    await page.waitForTimeout(300);
    expect(posts.n).toBe(0);
    expect(await page.locator("#contact-form").evaluate((f) => f.checkValidity())).toBe(false);
    await expect(page.locator("#f-nom")).toBeFocused();
    await expect(page.locator("#form-status")).toBeEmpty();
  });

  test("e-mail invalide bloqué", async ({ page }) => {
    const posts = countPosts(page);
    await fillValid(page, "Test e-mail invalide");
    await page.locator("#f-email").fill("pas-un-email");
    await page.locator("#contact-form button[type=submit]").click();
    await page.waitForTimeout(300);
    expect(posts.n).toBe(0);
    expect(await page.locator("#f-email").evaluate((i) => i.validity.valid)).toBe(false);
  });

  test("consentement obligatoire", async ({ page }) => {
    const posts = countPosts(page);
    await fillValid(page, "Test consentement");
    await page.locator("#f-consent").uncheck();
    await page.locator("#contact-form button[type=submit]").click();
    await page.waitForTimeout(300);
    expect(posts.n).toBe(0);
  });

  test("envoi réussi de bout en bout : message, remise à zéro, e-mail reçu", async ({ page }, testInfo) => {
    const org = `Cabinet Test ${testInfo.project.name} ${Date.now()}`;
    await fillValid(page, org);
    const response = page.waitForResponse((r) => r.url().includes("contact.php"));
    await page.locator("#contact-form button[type=submit]").click();
    expect((await response).status()).toBe(200);
    const status = page.locator("#form-status");
    await expect(status).toHaveClass(/is-success/);
    await expect(status).toContainText("Merci, votre demande a bien été envoyée");
    await expect(page.locator("#f-nom")).toHaveValue("");
    await expect(page.locator("#f-consent")).not.toBeChecked();

    await expect.poll(() => findMail(org), { timeout: 5000 }).not.toBeNull();
    const mail = findMail(org);
    expect(mail).toContain("To: contact@secutop.fr");
    expect(mail).toContain("Reply-To: jeanne.martin@example.com");
    expect(mail).toContain("Type de structure : IPRP");
    expect(mail).toContain("Clients ou adhérents : De 50 à 200");
    expect(mail).toContain("Nous souhaitons proposer SECUSOFT à nos adhérents.");
  });

  test("bouton désactivé pendant l'envoi puis réactivé", async ({ page }) => {
    await page.route("**/contact.php", async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await fillValid(page, "Test attente");
    const button = page.locator("#contact-form button[type=submit]");
    await button.click();
    await expect(button).toBeDisabled();
    await expect(button).toHaveText("Envoi en cours…");
    await expect(page.locator("#form-status")).toHaveClass(/is-success/);
    await expect(button).toBeEnabled();
    await expect(button).toHaveText("Envoyer ma demande");
  });

  test("erreur serveur : message affiché, saisie conservée", async ({ page }) => {
    await page.route("**/contact.php", (route) =>
      route.fulfill({ status: 422, contentType: "application/json", body: '{"ok":false,"message":"Merci de vérifier les champs suivants : e-mail."}' })
    );
    await fillValid(page, "Test erreur");
    await page.locator("#contact-form button[type=submit]").click();
    const status = page.locator("#form-status");
    await expect(status).toHaveClass(/is-error/);
    await expect(status).toHaveText("Merci de vérifier les champs suivants : e-mail.");
    await expect(page.locator("#f-nom")).toHaveValue("Jeanne Martin");
  });

  test("réponse illisible ou réseau coupé : message de repli", async ({ page }) => {
    await page.route("**/contact.php", (route) => route.fulfill({ status: 500, contentType: "text/html", body: "<h1>Erreur</h1>" }));
    await fillValid(page, "Test HTML");
    await page.locator("#contact-form button[type=submit]").click();
    await expect(page.locator("#form-status")).toHaveText(/L'envoi n'a pas abouti/);

    await page.unroute("**/contact.php");
    await page.route("**/contact.php", (route) => route.abort("internetdisconnected"));
    await page.locator("#contact-form button[type=submit]").click();
    await expect(page.locator("#form-status")).toHaveText(/L'envoi n'a pas abouti/);
    await expect(page.locator("#contact-form button[type=submit]")).toBeEnabled();
  });

  test("champ piège invisible et hors tabulation", async ({ page }) => {
    const hp = page.locator("#f-site");
    expect(await hp.getAttribute("tabindex")).toBe("-1");
    await expect(hp).not.toBeInViewport();
  });
});

test.describe("Sans JavaScript", () => {
  // Sans JS, les vérifications de stabilité de Playwright ne s'exécutent pas :
  // on agit au clavier et sans animation de défilement.
  async function noJsPage(browser, baseURL, testInfo) {
    const context = await browser.newContext({ ...testInfo.project.use, baseURL, javaScriptEnabled: false, reducedMotion: "reduce" });
    return { context, page: await context.newPage() };
  }

  test("le formulaire reste utilisable : validation native puis page de confirmation", async ({ browser, baseURL }, testInfo) => {
    const { context, page } = await noJsPage(browser, baseURL, testInfo);
    await page.goto("/#contact");
    const submit = page.locator("#contact-form button[type=submit]");
    await submit.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    expect(page.url()).not.toContain("contact.php");
    expect(page.url()).not.toContain("merci.html");

    const org = `Sans JS ${testInfo.project.name} ${Date.now()}`;
    await page.locator("#f-nom").fill("Paul Durand");
    await page.locator("#f-organisation").fill(org);
    await page.locator("#f-email").fill("paul@example.com");
    await page.locator("#f-telephone").fill("0612345678");
    await page.locator("#f-structure").selectOption("Réseau");
    await page.locator("#f-consent").focus();
    await page.keyboard.press("Space");
    expect(await page.locator("#f-consent").isChecked()).toBe(true);
    await submit.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/merci\.html$/);
    await expect(page.locator("h1")).toHaveText("Merci, votre demande est envoyée");
    await expect.poll(() => findMail(org), { timeout: 5000 }).not.toBeNull();
    await context.close();
  });

  test("les ancres et la FAQ fonctionnent sans JavaScript", async ({ browser, baseURL }, testInfo) => {
    const { context, page } = await noJsPage(browser, baseURL, testInfo);
    await page.goto("/");
    await page.locator(".hero__actions .btn--light").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#principe$/);
    const item = page.locator(".faq-item").nth(1);
    await item.locator("summary").focus();
    await page.keyboard.press("Enter");
    expect(await item.evaluate((d) => d.open)).toBe(true);
    await context.close();
  });
});

test.describe("Clavier et accessibilité", () => {
  test("lien d'évitement : visible au premier Tab et mène au contenu", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.locator(".skip-link");
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    const inMain = await page.evaluate(() => !!document.activeElement.closest("main"));
    expect(inMain).toBe(true);
  });

  test("parcours complet au Tab : tout est atteignable avec un focus visible", async ({ page }, testInfo) => {
    await page.goto("/");
    const seen = [];
    const invisibleFocus = [];
    for (let i = 0; i < 160; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
        const visible =
          (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
          cs.boxShadow !== "none" ||
          (el.id === "brand-input" && parent && parent.borderColor === "rgb(31, 171, 227)");
        return {
          key: el.id || `${el.tagName.toLowerCase()}:${(el.getAttribute("href") || el.textContent || "").trim().slice(0, 30)}`,
          visible,
        };
      });
      if (!info) continue;
      seen.push(info.key);
      if (!info.visible) invisibleFocus.push(info.key);
    }
    expect(seen).toContain("brand-input");
    expect(seen).toContain("sim-packs");
    expect(seen).toContain("f-consent");
    expect(seen.some((k) => k.startsWith("button:Envoyer ma demande"))).toBe(true);
    expect(seen.some((k) => k.includes("mentions-legales.html"))).toBe(true);
    expect(seen).not.toContain("f-site");
    if (isMobile(testInfo)) expect(seen.some((k) => k.startsWith("button:"))).toBe(true);
    expect(invisibleFocus).toEqual([]);
  });

  test("audit axe (hors contraste du bleu de la charte)", async ({ browser, baseURL }, testInfo) => {
    // bypassCSP : l'outil d'audit est injecté en script inline, bloqué par la CSP d'Apache.
    const context = await browser.newContext({ ...testInfo.project.use, baseURL, bypassCSP: true });
    const page = await context.newPage();
    await page.goto("/");
    await page.addScriptTag({ content: fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8") });
    const result = await page.evaluate(() =>
      window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"], rules: { "color-contrast": { enabled: false } } })
    );
    const violations = result.violations.map((v) => `${v.id} (${v.nodes.length})`);
    expect(violations).toEqual([]);
    await context.close();
  });
});
