// Tests du .htaccess (redirections, en-têtes, fichiers protégés).
// Nécessitent un Apache qui lit le .htaccess, comme chez OVH :
//   HTACCESS_URL=http://127.0.0.1:8095       site servi par Apache (port autre que 80)
//   HTACCESS_HTTP_URL=http://127.0.0.1       même site sur le port 80 (redirection HTTPS)
// Sans ces variables, les tests sont ignorés.
const { test, expect } = require("@playwright/test");
const { watchErrors } = require("./helpers");

const BASE = process.env.HTACCESS_URL;
const HTTP = process.env.HTACCESS_HTTP_URL;

test.beforeEach(async ({}, testInfo) => {
  test.skip(!BASE, "HTACCESS_URL non défini");
  test.skip(testInfo.project.name !== "desktop", "tests Apache lancés une seule fois");
});

test("en-têtes de sécurité présents", async ({ request }) => {
  const res = await request.get(`${BASE}/`);
  expect(res.status()).toBe(200);
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-frame-options"]).toBe("SAMEORIGIN");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["content-type"]).toContain("charset=utf-8");
});

test("la page fonctionne sous la politique CSP (aucune violation)", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.locator("#brand-input").fill("Test CSP");
  await expect(page.locator(".js-slug")).toHaveText("test-csp");
  await page.locator("#sim-packs").focus();
  await page.keyboard.press("End");
  expect(await page.locator("#sim-packs").evaluate((el) => el.style.getPropertyValue("--fill"))).toBe("100%");
  expect(errors).toEqual([]);
});

test("/index.html redirige vers /", async ({ request }) => {
  const res = await request.get(`${BASE}/index.html`, { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(new URL(res.headers()["location"], BASE).pathname).toBe("/");
});

test("www.ma-prevention.fr redirige vers ma-prevention.fr", async ({ request }) => {
  const res = await request.get(`${BASE}/mentions-legales.html`, {
    maxRedirects: 0,
    headers: { Host: "www.ma-prevention.fr" },
  });
  expect(res.status()).toBe(301);
  expect(res.headers()["location"]).toBe("https://ma-prevention.fr/mentions-legales.html");
});

test("HTTP (port 80) redirige vers HTTPS", async ({ request }) => {
  test.skip(!HTTP, "HTACCESS_HTTP_URL non défini");
  const res = await request.get(`${HTTP}/tarifs?x=1`, { maxRedirects: 0, headers: { Host: "ma-prevention.fr" } });
  expect(res.status()).toBe(301);
  expect(res.headers()["location"]).toBe("https://ma-prevention.fr/tarifs?x=1");
});

test("page inexistante : 404 personnalisée", async ({ request }) => {
  const res = await request.get(`${BASE}/page-qui-n-existe-pas`);
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain("Page introuvable");
});

test("fichiers internes non accessibles", async ({ request }) => {
  const blocked = async (path) => (await request.get(`${BASE}${path}`, { maxRedirects: 0 })).status();
  expect(await blocked("/README.md")).toBe(403);
  expect([403, 404]).toContain(await blocked("/.htaccess"));
  expect([403, 404]).toContain(await blocked("/.gitignore"));
  expect(await blocked("/tests/site.spec.js")).toBe(404);
  expect(await blocked("/tests/")).toBe(404);
  expect(await blocked("/tests/package.json")).toBe(404);
});

test("dépôt Git non exposé (déploiement Git OVH)", async ({ request }) => {
  for (const path of ["/.git/", "/.git/config", "/.git/HEAD", "/.git/index"]) {
    expect((await request.get(`${BASE}${path}`, { maxRedirects: 0 })).status(), path).toBe(404);
  }
  expect((await request.get(`${BASE}/CNAME`)).status()).toBe(404);
});

test("cache et compression", async ({ request }) => {
  const css = await request.get(`${BASE}/assets/css/styles.css?v=1`, { headers: { "Accept-Encoding": "gzip" } });
  expect(css.headers()["cache-control"]).toMatch(/max-age=\d{6,}/);
  expect(css.headers()["content-encoding"]).toBe("gzip");
  const font = await request.get(`${BASE}/assets/fonts/rubik-latin-wght-normal.woff2`);
  expect(font.headers()["content-type"]).toBe("font/woff2");
  expect(font.headers()["cache-control"]).toMatch(/max-age=31536000/);
  const html = await request.get(`${BASE}/`);
  expect(html.headers()["cache-control"]).toMatch(/max-age=0/);
});

test("formulaire fonctionnel derrière Apache", async ({ request }) => {
  const res = await request.post(`${BASE}/contact.php`, {
    form: { nom: "" },
    headers: { Accept: "application/json" },
  });
  expect(res.status()).toBe(422);
});
