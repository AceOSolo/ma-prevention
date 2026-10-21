# ma-prevention.fr

Site vitrine (one-page) de l'offre distributeur **Ma-prevention** : la plateforme de prévention des risques QHSE en marque blanche et ses packs (l'IA est intégrée à la plateforme, ce n'est pas un pack), éditée et vendue par **SimplX**. **SECUSOFT** y est présenté comme exemple de marque blanche (section `#exemple`) et en captures d'écran (section `#captures`).

Baseline : « Votre marque. Leur sécurité. Vos revenus. »

L'identité suit la charte graphique Ma-prevention (logo « l'étiquette », violet, rose, trait d'union), publiée sur claude.ai : https://claude.ai/artifact/Gv4hqXBWUKW1ox5t71obPY (privée tant qu'elle n'est pas partagée).

Site statique en HTML, CSS et JavaScript, sans framework ni étape de compilation. Les demandes de contact renvoient vers la page contact de SimplX (https://www.simplx.fr/contact/).

## Structure

```
index.html              Page principale (one-page)
mentions-legales.html   Mentions légales et politique de confidentialité
404.html                Page introuvable
.htaccess               HTTPS, redirection www, en-têtes de sécurité, cache
robots.txt, sitemap.xml Référencement
favicon.ico
assets/
  css/styles.css        Styles (charte Ma-prevention : Bricolage Grotesque, Atkinson Hyperlegible,
                        violet #6a18c2, rose #d1196c, nuit #1e1030, trait d'union #ff3d8b)
  js/main.js            Menu mobile, aperçu de marque, onglets (profils, captures), exemple de marque blanche,
                        remises volume, simulateur de marge, compteur de places
  fonts/                Bricolage Grotesque, Atkinson Hyperlegible Next et Mono auto-hébergées (licence SIL OFL)
  img/                  Logos Ma-prevention (SVG), logo SimplX (pied de page), logo SECUSOFT (exemple), favicons, image de partage
  img/captures/         Captures SECUSOFT (WebP, pleine taille et version -960 pour les petits écrans)
```

## Réglages courants

| Besoin | Où modifier |
|---|---|
| Nombre de places early bird restantes | `index.html`, attribut `data-places="20"` sur la balise `<body>`. À 0, le compteur disparaît. |
| Lien du bouton « Contacter SimplX » | `index.html`, section `#contact` |
| Liste et contenu des packs | `index.html`, section `#packs` (et question « Quels packs… » de la FAQ). Les noms reprennent ceux de la plateforme (écran « Mes abonnements »). Le site n'annonce volontairement aucun nombre de packs : il évolue avec les packs à venir. |
| Profils de distributeurs (« Pour qui ? ») | `index.html`, section `#pour-qui` : un bouton d'onglet et un panneau `.profile` par profil |
| Remises volume | `assets/js/main.js`, constantes `REMISES` et `SEUIL_PILOTAGE` ; textes et escalier des prix dans `index.html` (bloc `#remises`, synthèse, FAQ) |
| Option espaces référents | `index.html`, section `#referents` (et synthèse, FAQ) |
| Tarifs et textes | `index.html` (sections `#tarifs`, `#modele`, `#abonnement`, `#synthese`, `#faq`) |
| Prix catalogue d'un pack (remises et simulateur) | `assets/js/main.js`, constante `PRIX_PACK` |
| Captures d'écran | `assets/img/captures/` : déposer la capture en WebP en deux tailles (`nom.webp` et `nom-960.webp`), puis ajouter un bouton d'onglet et un panneau `.shot-panel` dans la section `#captures` |
| Baseline | `index.html` : hero (`#hero-title`), pied de page (`.site-footer__baseline`), `og:title` ; image de partage `assets/img/og-image.png` |
| Exemple de marque blanche (SECUSOFT) | `index.html`, section `#exemple` ; couleur dans `assets/js/main.js` (`THEMES`) et `styles.css` (`.app--secusoft`, affichage sans JavaScript) |

Après une modification de `styles.css` ou `main.js`, incrémentez le paramètre `?v=…` dans les balises `<link>` et `<script>` des trois pages pour que les navigateurs rechargent les fichiers.

L'aperçu de l'exemple applique les règles de contraste de la charte : texte blanc sur la couleur de la marque dès 4,5:1, sinon texte foncé ; liens et repères assombris jusqu'à 4,5:1 sur fond blanc. Les couleurs de cotation des risques ne changent pas d'une marque à l'autre.

## Mise en ligne

Le site est publié par **GitHub Pages** depuis la branche `main`, sur le domaine `ma-prevention.fr` (fichier `CNAME`, à conserver : le supprimer détache le domaine du site). Le nom de domaine est géré chez OVH, dont la zone DNS pointe vers GitHub Pages.

Ce qui est fusionné dans `main` est en ligne après quelques minutes.

Limites de GitHub Pages, qui ne sert que des fichiers statiques :

- Pas de PHP : le site n'a donc pas de formulaire, le bouton de contact mène à https://www.simplx.fr/contact/.
- Le `.htaccess` est ignoré (redirections, en-têtes de sécurité). GitHub gère lui-même le HTTPS (option *Enforce HTTPS* dans Settings > Pages). Le `.htaccess` reste utile si le site passe un jour sur l'hébergement web OVH.

### HTTPS

Au 21/10/2026, le site répond en HTTP mais pas en HTTPS : GitHub n'a pas émis de certificat pour `ma-prevention.fr` (le navigateur reçoit le certificat générique de GitHub, d'où l'erreur). La zone DNS est correcte (4 enregistrements A vers GitHub Pages, `www` en CNAME vers `aceosolo.github.io`, aucun enregistrement CAA bloquant). Pour déclencher l'émission, avec le compte propriétaire du dépôt :

1. Settings > Pages > Custom domain : supprimer `ma-prevention.fr`, enregistrer, puis le saisir de nouveau et enregistrer.
2. Attendre « DNS check successful », puis l'émission du certificat (de quelques minutes à 24 heures).
3. Cocher **Enforce HTTPS** : les visites en `http://` sont alors redirigées vers `https://`.

Supprimer le domaine dans les réglages réécrit le fichier `CNAME` sur `main` : vérifier qu'il contient toujours `ma-prevention.fr` après l'opération.

Les sous-domaines des marques blanches (`votre-marque.ma-prevention.fr`) sont gérés par la plateforme Ma-prevention et ne dépendent pas de ce site.

## Avant la mise en production

- Compléter le directeur de la publication (`[à compléter]`) dans `mentions-legales.html` et vérifier l'immatriculation RCS de SimplX.
- Vérifier les coordonnées de contact de SimplX (adresse, e-mail) ; ajouter un numéro de téléphone si souhaité.

## Tester en local

```
php -S 127.0.0.1:8080
```

Puis ouvrir http://127.0.0.1:8080.

## Tests automatisés

Le dossier `tests/` contient une suite Playwright (Chromium, format desktop 1440 px et mobile 390 px) qui vérifie :

- chargement sans erreur, images et polices de la charte, pages annexes ;
- chaque lien et bouton (ancres, menu, CTA, pied de page, mentions légales), sans élément masqué ou recouvert ;
- défilement : position des sections sous l'en-tête collant, accès direct par URL, molette, clavier, tactile, absence de défilement horizontal de 320 à 1920 px ;
- menu mobile, aperçu de marque, simulateur (souris et clavier), FAQ, compteur de places ;
- section des packs (noms de la plateforme, pack Effectifs et compétences offert, packs à venir, IA dans le socle commun, aucun nombre de packs annoncé, grille sans case vide) ;
- remises volume (montants de 1 à 5 packs, Pilotage et plan d'actions offert dès 3), profils « Pour qui ? » (clic et clavier), captures d'écran, option référents ;
- mentions retirées : Flex, SECUSAM, espaces « Je cherche / Je propose », « Réserver ma place » ;
- exemple SECUSOFT : bascule entre SECUSOFT, le thème par défaut et une couleur libre, contrastes d'au moins 4,5:1 sur le bouton et les repères, affichage sans JavaScript ;
- bouton de contact et liens vers simplx.fr (ouverture dans un nouvel onglet vers la bonne adresse), aucune mention de Secutop ;
- clavier et accessibilité (lien d'évitement, focus visible, audit axe contrastes compris, sur chaque thème de l'exemple) ;
- si un Apache est disponible, le `.htaccess`.

```
cd tests
npm install
npx playwright test
```

PHP doit être installé : le site est servi localement par `php -S`. Pour tester aussi le `.htaccess`, servir le site avec Apache et définir `BASE_URL`, `HTACCESS_URL` (et `HTACCESS_HTTP_URL` pour la redirection HTTPS sur le port 80). 

## Crédits

- Polices Bricolage Grotesque, Atkinson Hyperlegible Next et Atkinson Hyperlegible Mono : SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`)
- Icônes : [Lucide](https://lucide.dev), licence ISC
