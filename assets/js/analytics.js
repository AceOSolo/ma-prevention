// Google Analytics (balise G-DFL6H7MGQE).
// Script séparé plutôt qu'en ligne dans le HTML : la CSP du .htaccess interdit les scripts inline.
// Mesure uniquement sur le domaine public, pour ne pas compter les visites locales et les tests.
if (/^(www\.)?ma-prevention\.fr$/.test(location.hostname)) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  gtag("js", new Date());
  // Cookies conservés 13 mois au plus (recommandation CNIL).
  gtag("config", "G-DFL6H7MGQE", { cookie_expires: 13 * 30 * 24 * 60 * 60 });
}
