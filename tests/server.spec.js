// Tests du traitement serveur du formulaire (contact.php), sans navigateur.
const { test, expect } = require("@playwright/test");
const { findMail } = require("./helpers");

const JSON_HEADERS = { Accept: "application/json" };

function validForm(org) {
  return {
    nom: "Jeanne Martin",
    organisation: org,
    email: "jeanne@example.com",
    telephone: "06 12 34 56 78",
    structure: "Cabinet de prévention",
    clients: "Plus de 1 000",
    message: "Bonjour,\nnous sommes intéressés.",
    consentement: "oui",
  };
}

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "tests serveur lancés une seule fois");
});

test("GET redirige vers le formulaire", async ({ request }) => {
  const res = await request.get("/contact.php", { maxRedirects: 0 });
  expect(res.status()).toBe(303);
  expect(res.headers()["location"]).toMatch(/index\.html#contact$/);
});

test("POST valide (JSON) : 200 et e-mail complet", async ({ request }) => {
  const org = `API ${Date.now()}`;
  const res = await request.post("/contact.php", { form: validForm(org), headers: JSON_HEADERS });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true, message: "Merci, votre demande a bien été envoyée." });
  const mail = findMail(org);
  expect(mail).not.toBeNull();
  expect(mail).toContain("ARGS: -fno-reply@ma-prevention.fr");
  expect(mail).toContain("To: contact@secutop.fr");
  expect(mail).toContain(`Subject: Offre distributeur SECUSOFT : nouvelle demande (${org})`);
  expect(mail).toContain("From: SECUSOFT marque blanche <no-reply@ma-prevention.fr>");
  expect(mail).toContain("Reply-To: jeanne@example.com");
  expect(mail).toContain("Content-Type: text/plain; charset=UTF-8");
  expect(mail).toContain("Nom : Jeanne Martin");
  expect(mail).toContain("Téléphone : 06 12 34 56 78");
  expect(mail).toContain("Type de structure : Cabinet de prévention");
  expect(mail).toContain("Bonjour,\nnous sommes intéressés.");
});

test("sujet avec accents encodé en UTF-8 (RFC 2047)", async ({ request }) => {
  const org = `Réseau Santé Sécurité ${Date.now()}`;
  const res = await request.post("/contact.php", { form: validForm(org), headers: JSON_HEADERS });
  expect(res.status()).toBe(200);
  const mail = findMail(org);
  expect(mail).not.toBeNull();
  const subjectBlock = mail.match(/^Subject: [\s\S]*?(?=\r?\n\S)/m)[0];
  expect(subjectBlock).toContain("=?UTF-8?B?");
  expect(subjectBlock).not.toMatch(/[éè]/);
  // Déplie l'en-tête puis décode les mots encodés adjacents (RFC 2047).
  const raw = subjectBlock.replace(/^Subject: /, "").replace(/\r?\n[ \t]/g, " ");
  const decoded = raw
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/(?:=\?UTF-8\?B\?[^?]+\?=)+/g, (words) =>
      Buffer.concat([...words.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((m) => Buffer.from(m[1], "base64"))).toString("utf8")
    );
  expect(decoded).toBe(`Offre distributeur SECUSOFT : nouvelle demande (${org})`);
});

test("POST valide sans JavaScript : redirection vers merci.html", async ({ request }) => {
  const res = await request.post("/contact.php", { form: validForm(`NoJS ${Date.now()}`), maxRedirects: 0 });
  expect(res.status()).toBe(303);
  expect(res.headers()["location"]).toBe("merci.html");
});

test("champs manquants ou invalides : 422 avec la liste des champs", async ({ request }) => {
  const res = await request.post("/contact.php", {
    form: { nom: "", email: "pas-un-email", telephone: "abc", structure: "Pirate", clients: "Beaucoup" },
    headers: JSON_HEADERS,
  });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(body.ok).toBe(false);
  for (const champ of ["nom", "organisation", "e-mail", "téléphone", "type de structure", "nombre de clients", "consentement"]) {
    expect(body.message).toContain(champ);
  }
});

test("erreur sans JavaScript : page HTML lisible, message échappé", async ({ request }) => {
  const res = await request.post("/contact.php", { form: { nom: "<script>x</script>" } });
  expect(res.status()).toBe(422);
  const html = await res.text();
  expect(html).toContain("Envoi impossible");
  expect(html).toContain("Retour au formulaire");
  expect(html).not.toContain("<script>x</script>");
});

test("injection d'en-têtes e-mail refusée ou neutralisée", async ({ request }) => {
  const marker = `Injection ${Date.now()}`;
  const bad = await request.post("/contact.php", {
    form: { ...validForm(marker), email: "a@b.fr\r\nBcc: victime@example.com" },
    headers: JSON_HEADERS,
  });
  expect(bad.status()).toBe(422);
  expect(findMail(marker)).toBeNull();

  const stamp = Date.now();
  const res = await request.post("/contact.php", {
    form: validForm(`Org ${stamp}\r\nBcc: victime@example.com`),
    headers: JSON_HEADERS,
  });
  expect(res.status()).toBe(200);
  const mail = findMail(`Org ${stamp}`);
  expect(mail).not.toBeNull();
  const headers = mail.split("\n\n")[0];
  expect(headers).not.toMatch(/^Bcc:/m);
});

test("champ piège rempli : réponse neutre, aucun e-mail envoyé", async ({ request }) => {
  const marker = `Robot ${Date.now()}`;
  const res = await request.post("/contact.php", {
    form: { ...validForm(marker), site_web: "http://spam.example" },
    headers: JSON_HEADERS,
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).ok).toBe(true);
  expect(findMail(marker)).toBeNull();
});

test("paramètres en tableau : pas de plantage", async ({ request }) => {
  const res = await request.post("/contact.php", {
    data: "nom[]=x&organisation[]=y&email[]=z&consentement[]=oui",
    headers: { ...JSON_HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
  });
  expect(res.status()).toBe(422);
  expect((await res.json()).ok).toBe(false);
});
