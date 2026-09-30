# ma-prevention.fr

Site vitrine (one-page) de l'offre distributeur **SECUSOFT en marque blanche**, édité par Secutop.

Site statique en HTML, CSS et JavaScript, sans framework ni étape de compilation. Les demandes de contact renvoient vers la page contact de secutop.fr (https://www.secutop.fr/contact/).

## Structure

```
index.html              Page principale (one-page)
mentions-legales.html   Mentions légales et politique de confidentialité
404.html                Page introuvable
.htaccess               HTTPS, redirection www, en-têtes de sécurité, cache
robots.txt, sitemap.xml Référencement
favicon.ico
assets/
  css/styles.css        Styles (charte Secutop : Rubik, #1FABE3, #00487B)
  js/main.js            Menu mobile, aperçu de marque, simulateur, compteur de places
  fonts/                Rubik auto-hébergée (licence SIL OFL)
  img/                  Logos SECUSOFT et Secutop, favicons, image de partage
```

## Réglages courants

| Besoin | Où modifier |
|---|---|
| Nombre de places early bird restantes | `index.html`, attribut `data-places="20"` sur la balise `<body>`. À 0, le compteur disparaît. |
| Lien du bouton « Contacter Secutop » | `index.html`, section `#contact` |
| Tarifs et textes | `index.html` (sections `#tarifs`, `#modele`, `#abonnement`, `#synthese`, `#faq`) |
| Prix du pack utilisé par le simulateur | `assets/js/main.js`, constante `PRIX_PACK` |

Après une modification de `styles.css` ou `main.js`, incrémentez le paramètre `?v=1` dans les balises `<link>` et `<script>` pour que les navigateurs rechargent les fichiers.

## Mise en ligne

Le site est publié par **GitHub Pages** depuis la branche `main`, sur le domaine `ma-prevention.fr` (fichier `CNAME`, à conserver : le supprimer détache le domaine du site). Le nom de domaine est géré chez OVH, dont la zone DNS pointe vers GitHub Pages.

Ce qui est fusionné dans `main` est en ligne après quelques minutes.

Limites de GitHub Pages, qui ne sert que des fichiers statiques :

- Pas de PHP : le site n'a donc pas de formulaire, le bouton de contact mène à https://www.secutop.fr/contact/.
- Le `.htaccess` est ignoré (redirections, en-têtes de sécurité). GitHub gère lui-même le HTTPS (option *Enforce HTTPS* dans Settings > Pages). Le `.htaccess` reste utile si le site passe un jour sur l'hébergement web OVH.

Les sous-domaines des marques blanches (`votre-marque.ma-prevention.fr`) sont gérés par la plateforme SECUSOFT et ne dépendent pas de ce site.

## Avant la mise en production

- Compléter les champs marqués `[à compléter]` dans `mentions-legales.html` (raison sociale, capital, RCS, directeur de la publication).
- Vérifier les coordonnées de contact (adresse, téléphone, e-mail).

## Tester en local

```
php -S 127.0.0.1:8080
```

Puis ouvrir http://127.0.0.1:8080.

## Tests automatisés

Le dossier `tests/` contient une suite Playwright (Chromium, format desktop 1440 px et mobile 390 px) qui vérifie :

- chargement sans erreur, images et police, pages annexes ;
- chaque lien et bouton (ancres, menu, CTA, pied de page, mentions légales), sans élément masqué ou recouvert ;
- défilement : position des sections sous l'en-tête collant, accès direct par URL, molette, clavier, tactile, absence de défilement horizontal de 320 à 1920 px ;
- menu mobile, aperçu de marque, simulateur (souris et clavier), FAQ, compteur de places ;
- bouton de contact et liens vers secutop.fr (ouverture dans un nouvel onglet vers la bonne adresse) ;
- clavier et accessibilité (lien d'évitement, focus visible, audit axe) ;
- si un Apache est disponible, le `.htaccess`.

```
cd tests
npm install
npx playwright test
```

PHP doit être installé : le site est servi localement par `php -S`. Pour tester aussi le `.htaccess`, servir le site avec Apache et définir `BASE_URL`, `HTACCESS_URL` (et `HTACCESS_HTTP_URL` pour la redirection HTTPS sur le port 80). 

## Crédits

- Police Rubik : SIL Open Font License 1.1 (`assets/fonts/OFL-Rubik.txt`)
- Icônes : [Lucide](https://lucide.dev), licence ISC
