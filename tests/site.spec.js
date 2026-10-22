// Tests fonctionnels de la page : liens, boutons, défilement, interactions, formulaire.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const { waitForScrollEnd, expectSectionInView, plain, watchErrors } = require("./helpers");

const isMobile = (testInfo) => testInfo.project.name === "mobile";

// Contacts SimplX : l'objet et la source signalent une demande venue de Ma-prevention.
const OBJET = "Ma-prevention – demande distributeur";
const CONTACT =
  "https://www.simplx.fr/contact/?objet=Ma-prevention%20%E2%80%93%20demande%20distributeur" +
  "&utm_source=ma-prevention.fr&utm_medium=referral&utm_campaign=distributeurs";
const MAIL = "mailto:contact@simplx.fr?subject=Ma-prevention%20%E2%80%93%20demande%20distributeur";

test.describe("Chargement", () => {
  test("la page se charge sans erreur ni ressource manquante", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle("Ma-prevention | Plateforme de prévention QHSE en marque blanche");

    const images = await page.$$eval("img", (imgs) =>
      imgs.map((i) => ({ src: i.getAttribute("src"), ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute("alt") }))
    );
    for (const img of images) {
      expect(img.ok, `image chargée : ${img.src}`).toBe(true);
      expect(img.alt, `texte alternatif : ${img.src}`).toBeTruthy();
    }

    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, ""));
    });
    for (const family of ["Bricolage Grotesque", "Atkinson Hyperlegible Next", "Atkinson Hyperlegible Mono"]) {
      expect(fonts, `police ${family} chargée`).toContain(family);
    }
    expect(errors).toEqual([]);
  });

  for (const url of ["/mentions-legales.html", "/cgv.html", "/404.html"]) {
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
    expect(tel).toEqual([]);
    expect(mail.length).toBeGreaterThan(0);
    expect(new Set(mail)).toEqual(new Set([MAIL]));
    for (const h of ext) expect(h).toMatch(/^https:\/\/www\.simplx\.fr\//);
    expect(hrefs.filter((h) => h === "" || h === "#")).toEqual([]);
  });

  test("navigation principale (desktop) : chaque lien amène à sa section", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "menu desktop");
    await page.goto("/");
    const links = page.locator(".site-nav a");
    await expect(links).toHaveCount(7);
    for (let i = 0; i < 7; i++) {
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
      [".hero__actions .btn--primary", "principe"],
      [".price-card:not(.price-card--featured) .btn", "contact"],
      [".price-card--featured .btn", "contact"],
      ['.faq__head a[href="#contact"]', "contact"],
      ['#pour-qui .note a[href="#contact"]', "contact"],
      ['.site-footer__nav a[href="#principe"]', "principe"],
      ['.site-footer__nav a[href="#pour-qui"]', "pour-qui"],
      ['.site-footer__nav a[href="#packs"]', "packs"],
      [".hero__link", "exemple"],
      ['.text-link[href="#packs"]', "packs"],
      ['.text-link[href="#referents"]', "referents"],
      ['.exemple__text .text-link[href="#captures"]', "captures"],
      ['.site-footer__nav a[href="#referents"]', "referents"],
      ['.site-footer__nav a[href="#exemple"]', "exemple"],
      ['.site-footer__nav a[href="#tarifs"]', "tarifs"],
      ['.site-footer__nav a[href="#modele"]', "modele"],
      ['.site-footer__nav a[href="#mise-en-service"]', "mise-en-service"],
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
  });

  test("page 404 : bouton de retour", async ({ page }) => {
    await page.goto("/404.html");
    await page.locator('a:has-text("Voir l\'offre distributeur")').click();
    await expect(page.locator("#hero-title")).toBeVisible();
  });
});

test.describe("SimplX, éditeur et vendeur", () => {
  test.beforeEach(async ({ context }) => {
    // Réponse locale : pas de dépendance au vrai site pendant les tests.
    await context.route("https://www.simplx.fr/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>Contact SimplX</title>" })
    );
  });

  for (const url of ["/", "/mentions-legales.html", "/cgv.html", "/404.html"]) {
    test(`aucune mention de Secutop sur ${url}`, async ({ page, request }) => {
      const source = await (await request.get(url)).text();
      expect(source).not.toMatch(/secutop/i);
      await page.goto(url);
      expect(await page.locator("body").innerText()).not.toMatch(/secutop/i);
      expect(await page.locator("img").evaluateAll((imgs) => imgs.map((i) => i.src).filter((s) => /secutop/i.test(s)))).toEqual([]);
    });
  }

  test("Ma-prevention présentée comme la plateforme, SimplX comme son éditeur", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero .eyebrow")).toHaveText("Plateforme QHSE en marque blanche");
    await expect(page.locator(".site-header__logo img")).toHaveAttribute("src", "assets/img/ma-prevention-logo.svg");
    await expect(page.locator(".hero__text")).toContainText("Ma-prevention est une plateforme");
    await expect(page.locator(".hero__text")).toContainText("SimplX, son éditeur");
    await expect(page.locator(".flow__card").first().locator(".flow__name")).toHaveText("SimplX");
    await expect(page.locator(".vendor__logo")).toHaveAttribute("href", "https://www.simplx.fr/");
    await expect(page.locator(".vendor__logo img")).toHaveAttribute("src", "assets/img/simplx-logo.png");
    await expect(page.locator(".vendor__logo")).toHaveAccessibleName("SimplX");
    await expect(page.locator(".site-footer__bottom")).toContainText("© 2026 SimplX");
  });

  test("liens vers la page contact SimplX : nouvel onglet, annoncés aux lecteurs d'écran", async ({ page }) => {
    await page.goto("/");
    const links = page.locator(`a[href="${CONTACT}"]`);
    await expect(links).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const link = links.nth(i);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      // Le bouton mobile est masqué sur desktop : pas de nom accessible à vérifier.
      if (await link.isVisible()) await expect(link).toHaveAccessibleName(/nouvel onglet/);
    }
  });

  test("le lien contact du pied de page ouvre la page contact SimplX sans quitter l'offre", async ({ page }) => {
    await page.goto("/");
    const popupPromise = page.waitForEvent("popup");
    await page.locator(".footer-ext").click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe(CONTACT);
    expect(page.url()).not.toContain("simplx.fr");
  });
});

test.describe("Les packs", () => {
  // Noms des packs tels qu'ils apparaissent dans la plateforme (« Mes abonnements »).
  const OFFERT = "Effectifs et compétences";
  const PACKS = [
    "Évaluation des risques – DUERP",
    "Événements et AT/MP",
    "Pilotage et plan d'actions",
    "Équipements et installations",
    "Entreprises extérieures",
    "Documents et registres",
  ];
  const A_VENIR = ["Environnement", "Qualité", "RSE et QVCT", "Veille et conformité réglementaire"];

  test("chaque pack est présenté avec une accroche et ses fonctionnalités", async ({ page }) => {
    await page.goto("/#packs");
    const cards = page.locator(".packs > .card.pack:not(.pack--offert)");
    await expect(cards.locator(".pack__name")).toHaveText(PACKS);
    for (let i = 0; i < PACKS.length; i++) {
      await expect(cards.nth(i).locator(".pack__lead")).not.toBeEmpty();
      expect(await cards.nth(i).locator(".pack__list li").count()).toBeGreaterThanOrEqual(3);
    }
    await expect(page.locator(".pack--soon .chip")).toHaveText(A_VENIR);
    await expect(page.locator(".pack--base .pack__name")).toHaveText("Inclus avec chaque pack");
    // L'IA n'est pas un pack : elle fait partie du socle commun.
    await expect(page.locator(".pack--base .pack__list")).toContainText("Assistant IA");
  });

  test("le pack Effectifs et compétences est mis en avant comme offert à tous", async ({ page }) => {
    await page.goto("/#packs");
    const offert = page.locator(".packs > .pack--offert");
    await expect(offert).toHaveCount(1);
    await expect(offert.locator(".pack__name")).toHaveText(OFFERT);
    await expect(offert.locator(".pack__badge")).toHaveText("Offert à tous vos clients");
    await expect(page.locator(".figures__list")).toContainText("Offert");
    await expect(page.locator(".figures__list")).toContainText(OFFERT);
    // Pilotage et plan d'actions : offert dès 3 packs achetés.
    const pilotage = page.locator(".packs > .card.pack", { hasText: "Pilotage et plan d'actions" });
    await expect(pilotage.locator(".pack__tag")).toHaveText(/Offert dès 3\s+packs achetés/);
  });

  test("aucun nombre de packs annoncé, ni pack IA", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/\b(?:[6-9]|1\d)\s+packs\b/);
    expect(text).not.toContain("Pack IA");
    for (const sel of ['meta[name="description"]', 'meta[property="og:description"]', 'script[type="application/ld+json"]']) {
      const value = sel.startsWith("script") ? await page.locator(sel).textContent() : await page.locator(sel).getAttribute("content");
      expect(value).not.toMatch(/\d+\s+packs/);
    }
  });

  test("la FAQ liste les mêmes packs", async ({ page }) => {
    await page.goto("/");
    const item = page.locator(".faq-item", { hasText: "Quels packs" });
    await item.locator("summary").click();
    const answer = await item.locator(".faq-item__answer").innerText();
    for (const name of [OFFERT, ...PACKS, ...A_VENIR]) expect(answer).toContain(name);
    await item.locator('a[href="#packs"]').click();
    await expectSectionInView(page, "packs");
  });

  test("grille des packs : 1, 2 puis 3 colonnes, sans case vide", async ({ page }) => {
    await page.goto("/#packs");
    for (const [width, cols] of [[390, 1], [800, 2], [1440, 3]]) {
      await page.setViewportSize({ width, height: 900 });
      const n = await page.locator(".packs").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      expect(n, `colonnes à ${width}px`).toBe(cols);
      // Le pack offert occupe toute la largeur ; la dernière ligne finit au bord droit avec le bloc « Inclus ».
      const [grid, offert, base] = await Promise.all([
        page.locator(".packs").boundingBox(),
        page.locator(".pack--offert").boundingBox(),
        page.locator(".pack--base").boundingBox(),
      ]);
      expect(Math.abs(grid.width - offert.width), `pack offert pleine largeur à ${width}px`).toBeLessThan(2);
      expect(Math.abs(grid.x + grid.width - (base.x + base.width)), `bord droit à ${width}px`).toBeLessThan(2);
    }
  });
});

test.describe("Remises volume", () => {
  const values = async (page) => ({
    catalogue: plain(await page.locator(".js-volume-catalogue").textContent()),
    remise: plain(await page.locator(".js-volume-remise").textContent()),
    total: plain(await page.locator(".js-volume-total").textContent()),
  });

  test("3 packs par défaut : 750 € HT et Pilotage et plan d'actions offert", async ({ page }) => {
    await page.goto("/#remises");
    await expect(page.locator('.volume__btn[data-packs="3"]')).toHaveAttribute("aria-pressed", "true");
    expect(await values(page)).toEqual({ catalogue: "900 €", remise: "−150 €", total: "750 € HT" });
    await expect(page.locator(".js-volume-gift")).toContainText("Pilotage et plan d'actions");
    await expect(page.locator(".stair.is-on")).toHaveCount(3);
  });

  for (const [packs, attendu, pilotage] of [
    [1, { catalogue: "300 €", remise: "0 €", total: "300 € HT" }, false],
    [2, { catalogue: "600 €", remise: "−60 €", total: "540 € HT" }, false],
    [4, { catalogue: "1 200 €", remise: "−270 €", total: "930 € HT" }, true],
    [5, { catalogue: "1 500 €", remise: "−420 €", total: "1 080 € HT" }, true],
  ]) {
    test(`${packs} pack(s) achetés ensemble`, async ({ page }) => {
      await page.goto("/#remises");
      const btn = page.locator(`.volume__btn[data-packs="${packs}"]`);
      await btn.click();
      await expect(btn).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator('.volume__btn[aria-pressed="true"]')).toHaveCount(1);
      expect(await values(page)).toEqual(attendu);
      await expect(page.locator(".stair.is-on")).toHaveCount(packs);
      const gift = page.locator(".js-volume-gift");
      if (pilotage) await expect(gift).toContainText("Offerts en plus : Pilotage et plan d'actions");
      else await expect(gift).toContainText("offert dès 3 packs");
    });
  }

  test("conditions affichées : achat groupé sous 24 heures", async ({ page }) => {
    await page.goto("/#remises");
    await expect(page.locator(".volume__intro")).toContainText("dans les mêmes 24 heures");
    await expect(page.locator(".stair__off")).toHaveText(["Plein tarif", "−20 %", "−30 %", "−40 %", "−50 %"]);
  });
});

test.describe("Pour qui ?", () => {
  const PROFILS = [
    ["tab-reseaux", "Réseaux professionnels et organisations à adhérents"],
    ["tab-assureurs", "Assureurs"],
    ["tab-comptables", "Experts-comptables"],
    ["tab-prevoyance", "Organismes de prévoyance"],
    ["tab-banques", "Services bancaires"],
    ["tab-consultants", "Consultants QHSE, IPRP et cabinets de prévention"],
  ];

  test("six profils, chacun avec ses avantages et ses cas d'usage", async ({ page }) => {
    await page.goto("/#pour-qui");
    await expect(page.locator("#pour-qui [role=tab]")).toHaveCount(6);
    for (const [tab, titre] of PROFILS) {
      await page.locator(`#${tab}`).click();
      await expect(page.locator(`#${tab}`)).toHaveAttribute("aria-selected", "true");
      const panel = page.locator("#pour-qui [role=tabpanel]:visible");
      await expect(panel).toHaveCount(1);
      await expect(panel.locator(".profile__title")).toHaveText(titre);
      expect(await panel.locator(".dash-list li").count()).toBeGreaterThanOrEqual(3);
      expect(await panel.locator(".usecases li").count()).toBeGreaterThanOrEqual(2);
    }
  });

  test("clavier : flèches, Début et Fin entre les onglets", async ({ page }) => {
    await page.goto("/#pour-qui");
    await page.locator("#tab-reseaux").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#tab-assureurs")).toBeFocused();
    await expect(page.locator("#profil-assureurs")).toBeVisible();
    await expect(page.locator("#profil-reseaux")).toBeHidden();
    await page.keyboard.press("End");
    await expect(page.locator("#tab-consultants")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#tab-reseaux")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#tab-consultants")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(page.locator("#tab-reseaux")).toHaveAttribute("aria-selected", "true");
    // Un seul onglet dans l'ordre de tabulation.
    expect(await page.locator('#pour-qui [role=tab][tabindex="0"]').count()).toBe(1);
  });
});

test.describe("Captures d'écran", () => {
  test("deux captures SECUSOFT, une visible à la fois, avec texte alternatif", async ({ page }) => {
    await page.goto("/#captures");
    const shots = page.locator("#captures .shot");
    await expect(shots).toHaveCount(2);
    await expect(page.locator("#capture-abonnements")).toBeVisible();
    await expect(page.locator("#capture-referent")).toBeHidden();
    await page.locator("#tab-capture-referent").click();
    await expect(page.locator("#capture-referent")).toBeVisible();
    await expect(page.locator("#capture-abonnements")).toBeHidden();
    const img = page.locator("#capture-referent img");
    expect(await img.evaluate((i) => i.complete && i.naturalWidth > 0)).toBe(true);
    expect((await img.getAttribute("alt")).length).toBeGreaterThan(40);
  });

  test("le lien de l'option référents ouvre la capture de l'espace référent", async ({ page }) => {
    await page.goto("/#referents");
    await page.locator('#referents a[data-tab-target="capture-referent"]').click();
    await expectSectionInView(page, "captures");
    await expect(page.locator("#tab-capture-referent")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#capture-referent")).toBeVisible();
  });

  test("lien vers la capture en taille réelle", async ({ request, page }) => {
    await page.goto("/#captures");
    const href = await page.locator("#capture-abonnements .text-link").getAttribute("href");
    const res = await request.get("/" + href);
    expect(res.status()).toBe(200);
  });
});

test.describe("Option espaces référents externalisés", () => {
  test("deux cas, avec ou sans compétences, et leurs conditions tarifaires", async ({ page }) => {
    await page.goto("/#referents");
    const scenarios = page.locator("#referents .scenario");
    await expect(scenarios).toHaveCount(2);
    await expect(scenarios.nth(0)).toContainText("Vous avez les compétences");
    await expect(scenarios.nth(1)).toContainText("Vous n'avez pas les compétences");
    await expect(scenarios.nth(0)).toContainText("100 € HT par client et par an");
    await expect(scenarios.nth(1)).not.toContainText("100 €");
    await expect(scenarios.nth(1).locator(".scenario__price dt").first()).toHaveText("Ouverture de l'espace");
    await expect(scenarios.nth(1).locator(".scenario__price dd").first()).toHaveText("Offerte");
    await expect(scenarios.nth(1)).toContainText("12 % de remise");
    await expect(scenarios.nth(1)).toContainText("apport d'affaires");
    await expect(page.locator("#referents")).toContainText("dans votre marque blanche");
  });
});

test.describe("Retours du 21 octobre 2026", () => {
  test("mentions retirées : Flex, SECUSAM, espaces « Je cherche / Je propose », « Réserver ma place »", async ({ page, request }) => {
    const source = await (await request.get("/")).text();
    expect(source).not.toMatch(/Flex/);
    expect(source).not.toMatch(/secusam/i);
    expect(source).not.toMatch(/Je cherche|Je propose/);
    expect(source).not.toMatch(/Réserver ma place|Réservez votre place/i);
    await page.goto("/");
    const text = await page.locator("body").innerText();
    // Limites de mots : « puis-je proposer » reste autorisé.
    expect(text).not.toMatch(/\bFlex\b|SECUSAM|\bJe cherche\b|\bJe propose\b|Réserver ma place|Réservez votre place/i);
  });

  test("le hero propose « Voir l'offre » et une baseline en trois temps", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".hero__actions a")).toHaveCount(1);
    await expect(page.locator(".hero__actions a")).toHaveText("Voir l'offre");
    await expect(page.locator("#hero-title .hero__line")).toHaveText(["Votre marque.", "Leur sécurité.", "Vos revenus."]);
    await expect(page.locator(".site-footer__baseline")).toHaveText("Votre marque. Leur sécurité. Vos revenus.");
  });
});

test.describe("Retours du 22 octobre 2026", () => {
  test("le tarif dégressif est présenté comme le prix catalogue appliqué par SimplX", async ({ page }) => {
    await page.goto("/#remises");
    const intro = page.locator(".volume__intro");
    await expect(intro.locator(".volume__title")).toHaveText("Plus vos clients prennent de packs, moins ils paient");
    await expect(intro).toContainText("Le prix catalogue des packs est dégressif : c'est le tarif que SimplX applique");
    await expect(intro).toContainText("Prix catalogue appliqué par SimplX");
    await expect(page.locator(".volume__result .sim__total")).toContainText("Prix catalogue pour votre client");
    const ligne = page.locator(".summary tr", { has: page.locator("th", { hasText: "Tarif dégressif des packs" }) });
    await expect(ligne).toContainText("Prix catalogue appliqué par SimplX");
    const faq = page.locator(".faq-item", { has: page.locator("summary", { hasText: "Comment fonctionne le tarif dégressif" }) });
    await expect(faq.locator(".faq-item__answer")).toContainText("C'est le prix catalogue appliqué par SimplX.");
    expect(await page.locator("body").innerText()).not.toMatch(/remises volume/i);
  });

  test("espace référent offert quand le distributeur fait appel à un référent SimplX", async ({ page }) => {
    await page.goto("/#referents");
    await expect(page.locator("#referents .scenario--simplx")).toContainText("Sollicitez directement SimplX");
    await expect(page.locator("#referents .referents__perks")).toContainText("Avec un référent SimplX, l'espace est offert.");
    const ligne = page.locator(".summary tr", { has: page.locator("th", { hasText: "Espace référent externalisé" }) });
    await expect(ligne).toContainText("Par client, avec vos intervenants. Avec un référent SimplX : espace offert");
    const faq = page.locator(".faq-item", { has: page.locator("summary", { hasText: "référent santé-sécurité" }) });
    await expect(faq.locator(".faq-item__answer")).toContainText("l'espace référent vous est offert");
  });

  test("les demandes de contact signalent qu'elles viennent de Ma-prevention", async ({ page }) => {
    for (const url of ["/", "/mentions-legales.html"]) {
      await page.goto(url);
      const liens = await page.$$eval('a[href*="simplx.fr/contact"]', (as) => as.map((a) => a.href));
      expect(liens.length, url).toBeGreaterThan(0);
      for (const lien of liens) {
        const params = new URL(lien).searchParams;
        expect(params.get("objet"), lien).toBe(OBJET);
        expect(params.get("utm_source"), lien).toBe("ma-prevention.fr");
      }
    }
    await page.goto("/");
    const mails = await page.$$eval('a[href^="mailto:"]', (as) => as.map((a) => a.getAttribute("href")));
    expect(mails.length).toBeGreaterThan(0);
    for (const mail of mails) expect(new URL(mail).searchParams.get("subject"), mail).toBe(OBJET);
  });

  test("mentions légales : informations de simplx.fr et hébergeur réel", async ({ page }) => {
    await page.goto("/mentions-legales.html");
    const prose = page.locator(".prose");
    for (const texte of [
      "SimplX, EURL au capital de 10 000 €",
      "Centre d'Affaires Handfield, 6 rue de Copenhague, 38070 Saint-Quentin-Fallavier",
      "SIREN : 521 357 392, SIRET du siège : 521 357 392 00070, RCS Vienne",
      "FR53 521 357 392",
      "Code APE : 62.02A",
      "04 28 35 04 32",
      "Gérant et directeur de la publication : Jean-Philippe Barret",
      "GitHub, Inc. (service GitHub Pages)",
    ]) {
      expect(plain(await prose.innerText()), texte).toContain(texte);
    }
    await expect(page.locator('a[href="tel:+33428350432"]')).toHaveCount(1);
    expect(plain(await prose.innerText())).not.toMatch(/à compléter|SARL|RCS Lyon|15 000/);
    await expect(prose.locator('a[href="cgv.html"]')).toHaveCount(1);
  });

  test("CGV : accessibles depuis le pied de page, la synthèse et les mentions légales", async ({ page }) => {
    await page.goto("/");
    await page.locator('.site-footer__bottom a[href="cgv.html"]').click();
    await expect(page).toHaveURL(/cgv\.html$/);
    await expect(page.locator("h1")).toHaveText("Conditions générales de vente");
    await page.locator('a:has-text("Retour à l\'offre")').click();
    await expect(page).toHaveURL(/\/(index\.html)?$/);

    await page.goto("/#synthese");
    await page.locator('.table-note a[href="cgv.html"]').click();
    await expect(page).toHaveURL(/cgv\.html$/);

    await page.goto("/mentions-legales.html");
    await page.locator('.site-footer__bottom a[href="cgv.html"]').click();
    await expect(page).toHaveURL(/cgv\.html$/);
  });

  test("CGV : sommaire complet, chaque entrée mène à son article sous l'en-tête", async ({ page }) => {
    await page.goto("/cgv.html");
    const liens = page.locator(".toc a");
    const hrefs = await liens.evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    const ids = await page.locator(".prose h2[id]").evaluateAll((hs) => hs.map((h) => "#" + h.id));
    expect(hrefs).toEqual(ids);
    expect(hrefs.length).toBeGreaterThanOrEqual(15);
    for (const id of ["#referents", "#juridiction"]) {
      await page.locator(`.toc a[href="${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`cgv\.html${id}$`));
      await expectSectionInView(page, id.slice(1));
    }
  });

  test("CGV : mêmes tarifs que la page de l'offre", async ({ page }) => {
    await page.goto("/cgv.html");
    const texte = plain(await page.locator(".prose").innerText());
    for (const attendu of [
      "Le fait de passer commande entraîne l'acceptation des présentes conditions générales de vente.",
      "2 900 € HT, ou 1 900 € HT au tarif early bird",
      "puis 900 € HT par an",
      "60 % du prix catalogue",
      "20 premières marques blanches",
      "10 codes promo de packs, d'une valeur catalogue de 300 € HT chacun",
      "Le prix catalogue est le tarif que SimplX applique aux packs",
      "dans les mêmes 24 heures",
      "1er pack : 300 € HT, plein tarif",
      "2e pack : 240 € HT, soit −20 %",
      "3e pack : 210 € HT, soit −30 %",
      "4e pack : 180 € HT, soit −40 %",
      "5e pack et suivants : 150 € HT, soit −50 %",
      "Le pack Pilotage et plan d'actions est offert dès 3 packs",
      "Le pack Effectifs et compétences est offert à tous les clients",
      "100 € HT par client et par an",
      "L'espace référent n'est alors pas facturé",
      "remise de 12 % au titre de l'apport d'affaires",
      "indemnité forfaitaire pour frais de recouvrement de 40 €",
      "40 ans glissants",
      "RCS Vienne 521 357 392",
    ]) {
      expect(texte, attendu).toContain(attendu);
    }
    // Les CGV n'annoncent pas de nombre de packs et ne reprennent aucun terme retiré.
    expect(texte).not.toMatch(/\b\d+ packs (disponibles|au total)|\bFlex\b|SECUSAM/i);
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
    expect(hrefs.length).toBe(8);
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
    ["", "votre-marque", "VOTRE LOGO", "IA"],
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
    await expect(items).toHaveCount(11);
    await expect(items.first()).toHaveAttribute("open", "");
    for (let i = 0; i < 11; i++) {
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

test.describe("Contact", () => {
  test.beforeEach(async ({ context }) => {
    await context.route("https://www.simplx.fr/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>Contact SimplX</title>" })
    );
  });

  test("le bouton « Contacter SimplX » ouvre la page contact de simplx.fr", async ({ page }) => {
    await page.goto("/#contact");
    const cta = page.locator(".contact-card__cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", CONTACT);
    await expect(cta).toHaveAttribute("target", "_blank");
    await expect(cta).toHaveAttribute("rel", /noopener/);
    await expect(cta).toHaveAccessibleName(/Contacter SimplX.*nouvel onglet/);
    const popupPromise = page.waitForEvent("popup");
    await cta.click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    expect(popup.url()).toBe(CONTACT);
    expect(page.url()).not.toContain("simplx.fr");
  });

  test("chaque bouton d'inscription mène au bouton de contact", async ({ page }, testInfo) => {
    await page.goto("/");
    const selectors = [".price-card .btn--secondary", ".price-card--featured .btn"];
    if (testInfo.project.name === "desktop") selectors.unshift(".site-header__cta");
    for (const selector of selectors) {
      await page.locator(selector).click();
      await expectSectionInView(page, "contact");
      // Desktop : bouton de la carte ; mobile : bouton placé sous le prix.
      const cta = testInfo.project.name === "desktop" ? ".contact-card__cta" : ".cta__mobile-cta";
      await expect(page.locator(cta)).toBeInViewport();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    }
  });

  test("bouton mobile visible seulement sur mobile, même destination", async ({ page }, testInfo) => {
    await page.goto("/#contact");
    const mobileCta = page.locator(".cta__mobile-cta");
    await expect(mobileCta).toHaveAttribute("href", CONTACT);
    await expect(mobileCta).toHaveAttribute("target", "_blank");
    if (testInfo.project.name === "desktop") {
      await expect(mobileCta).toBeHidden();
    } else {
      const popupPromise = page.waitForEvent("popup");
      await mobileCta.click();
      expect((await popupPromise).url()).toBe(CONTACT);
    }
  });

  test("e-mail SimplX proposé en alternative", async ({ page }) => {
    await page.goto("/#contact");
    const alt = page.locator(".contact-card__alt");
    await expect(alt.locator(`a[href="${MAIL}"]`)).toBeVisible();
  });

  test("aucun formulaire ni envoi de données depuis le site", async ({ page }) => {
    const posts = [];
    page.on("request", (r) => {
      if (r.method() !== "GET") posts.push(r.url());
    });
    await page.goto("/");
    expect(await page.locator("form").count()).toBe(0);
    await page.locator(".contact-card__cta").scrollIntoViewIfNeeded();
    expect(posts).toEqual([]);
  });
});

test.describe("Sans JavaScript", () => {
  // Sans JS, les vérifications de stabilité de Playwright ne s'exécutent pas :
  // on agit au clavier et sans animation de défilement.
  async function noJsPage(browser, baseURL, testInfo) {
    const context = await browser.newContext({ ...testInfo.project.use, baseURL, javaScriptEnabled: false, reducedMotion: "reduce" });
    return { context, page: await context.newPage() };
  }

  test("les ancres et la FAQ fonctionnent sans JavaScript", async ({ browser, baseURL }, testInfo) => {
    const { context, page } = await noJsPage(browser, baseURL, testInfo);
    await page.goto("/");
    await page.locator(".hero__actions .btn--primary").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#principe$/);
    const item = page.locator(".faq-item").nth(1);
    await item.locator("summary").focus();
    await page.keyboard.press("Enter");
    expect(await item.evaluate((d) => d.open)).toBe(true);
    await context.close();
  });

  test("profils, captures et remises restent lisibles sans JavaScript, sans commandes inactives", async ({ browser, baseURL }, testInfo) => {
    const { context, page } = await noJsPage(browser, baseURL, testInfo);
    await page.goto("/");
    // Onglets masqués, tous les panneaux affichés.
    for (const sel of ["#pour-qui [role=tablist]", "#captures [role=tablist]", ".js-volume"]) {
      await expect(page.locator(sel)).toBeHidden();
    }
    const profils = page.locator("#pour-qui .profile");
    await expect(profils).toHaveCount(6);
    for (let i = 0; i < 6; i++) await expect(profils.nth(i)).toBeVisible();
    for (const id of ["capture-abonnements", "capture-referent"]) await expect(page.locator(`#${id}`)).toBeVisible();
    // Exemple chiffré pour 3 packs, lisible tel quel.
    await expect(page.locator(".js-volume-case")).toContainText("3");
    await expect(page.locator(".js-volume-total")).toContainText("750");
    await context.close();
  });

  test("l'exemple SECUSOFT reste lisible sans JavaScript, sans commandes inactives", async ({ browser, baseURL }, testInfo) => {
    const { context, page } = await noJsPage(browser, baseURL, testInfo);
    await page.goto("/#exemple");
    await expect(page.locator(".js-theme-switch")).toBeHidden();
    await expect(page.locator('.app__brand--secusoft img[alt="SECUSOFT"]')).toBeVisible();
    await expect(page.locator(".app__brand--defaut")).toBeHidden();
    await expect(page.locator(".app__button")).toHaveCSS("color", "rgb(30, 16, 48)");
    await context.close();
  });
});

test.describe("Exemple de marque blanche : SECUSOFT", () => {
  const contrast = (page) =>
    page.locator(".js-app").evaluate((app) => {
      const btn = app.querySelector(".app__button");
      const parse = (c) => c.match(/\d+/g).slice(0, 3).map(Number);
      const lum = (rgb) => {
        const [r, g, b] = rgb.map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a, b) => {
        const x = lum(parse(a)), y = lum(parse(b));
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      const cs = getComputedStyle(btn);
      const tab = getComputedStyle(app.querySelector(".app__tab.is-active"));
      return { bouton: ratio(cs.color, cs.backgroundColor), repere: ratio(tab.borderBottomColor, "rgb(255, 255, 255)") };
    });

  test("SECUSOFT affiché par défaut, avec son logo et un bouton lisible", async ({ page }) => {
    await page.goto("/#exemple");
    await expect(page.locator('.theme-switch__btn[data-theme="secusoft"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.app__brand--secusoft img[alt="SECUSOFT"]')).toBeVisible();
    await expect(page.locator(".js-app")).toHaveAttribute("aria-label", /sous la marque SECUSOFT/);
    const c = await contrast(page);
    expect(c.bouton).toBeGreaterThanOrEqual(4.5);
    expect(c.repere).toBeGreaterThanOrEqual(4.5);
    await expect(page.locator(".js-theme-rule")).toContainText("6,8:1");
  });

  test("bascule vers le thème par défaut puis retour à SECUSOFT", async ({ page }) => {
    await page.goto("/#exemple");
    await page.locator('.theme-switch__btn[data-theme="defaut"]').click();
    await expect(page.locator('.theme-switch__btn[data-theme="defaut"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.theme-switch__btn[data-theme="secusoft"]')).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator('.app__brand--defaut img[alt="ma-prevention"]')).toBeVisible();
    await expect(page.locator(".app__brand--secusoft")).toBeHidden();
    await expect(page.locator(".app__button")).toHaveCSS("background-color", "rgb(106, 24, 194)");
    await expect(page.locator(".app__button")).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(page.locator(".js-theme-rule")).toContainText("blanc");
    await page.locator('.theme-switch__btn[data-theme="secusoft"]').click();
    await expect(page.locator('.app__brand--secusoft')).toBeVisible();
  });

  for (const [couleur, texte] of [["#ffcc00", "foncé"], ["#e30613", "blanc"], ["#00487b", "blanc"], ["#ffffff", "foncé"], ["#7fd1ff", "foncé"]]) {
    test(`votre couleur ${couleur} : texte ${texte}, contrastes d'au moins 4,5:1`, async ({ page }) => {
      await page.goto("/#exemple");
      await page.locator("#theme-color").fill(couleur);
      await expect(page.locator(".theme-switch__custom")).toHaveClass(/is-active/);
      await expect(page.locator(".app__brand--perso")).toBeVisible();
      await expect(page.locator(".js-theme-rule")).toContainText(`en ${texte}`);
      const c = await contrast(page);
      expect(c.bouton).toBeGreaterThanOrEqual(4.5);
      expect(c.repere).toBeGreaterThanOrEqual(4.5);
    });
  }

  test("votre couleur reprend le nom de marque saisi dans le hero, sans l'interpréter", async ({ page }) => {
    await page.goto("/");
    await page.locator("#brand-input").fill("Réseau <b>Sud</b>");
    await page.locator("#theme-color").fill("#2e9e6f");
    const perso = page.locator(".app__brand--perso");
    await expect(perso.locator(".app__initiale")).toHaveText("R");
    await expect(perso).toContainText("Réseau <b>Sud</b>");
    await expect(perso.locator("b")).toHaveCount(0);
    await page.locator("#brand-input").fill("");
    await expect(perso.locator(".app__initiale")).toHaveText("V");
    await expect(perso).toContainText("Votre marque");
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
    for (let i = 0; i < 220; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
        const visible =
          (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) ||
          cs.boxShadow !== "none" ||
          (el.id === "brand-input" && parent && parent.borderColor === "rgb(106, 24, 194)");
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
    expect(seen).toContain("tab-reseaux");
    expect(seen).toContain("profil-reseaux");
    expect(seen).toContain("theme-color");
    expect(seen).toContain("tab-capture-abonnements");
    expect(seen).toContain("button:5 et +");
    expect(seen).toContain("sim-packs");
    expect(seen.some((k) => k.includes("simplx.fr/contact"))).toBe(true);
    expect(seen.some((k) => k.includes("mentions-legales.html"))).toBe(true);
    expect(seen).not.toContain("f-site");
    if (isMobile(testInfo)) expect(seen.some((k) => k.startsWith("button:"))).toBe(true);
    expect(invisibleFocus).toEqual([]);
  });

  // La charte Ma-prevention passe les contrastes AA : l'audit les vérifie, sur chaque thème de l'aperçu.
  for (const theme of ["secusoft", "defaut", "perso"]) {
    test(`audit axe, contrastes compris (aperçu ${theme})`, async ({ browser, baseURL }, testInfo) => {
      // bypassCSP : l'outil d'audit est injecté en script inline, bloqué par la CSP d'Apache.
      const context = await browser.newContext({ ...testInfo.project.use, baseURL, bypassCSP: true, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto("/");
      if (theme === "perso") await page.locator("#theme-color").fill("#ffcc00");
      else await page.locator(`.theme-switch__btn[data-theme="${theme}"]`).click();
      await page.addScriptTag({ content: fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8") });
      const result = await page.evaluate(() => window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "best-practice"] }));
      const violations = result.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
      expect(violations).toEqual([]);
      await context.close();
    });
  }
});
