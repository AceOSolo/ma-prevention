# ma-prevention.fr

Site vitrine (one-page) de l'offre distributeur **SECUSOFT en marque blanche**, édité par Secutop.

Site statique en HTML, CSS et JavaScript, sans framework ni étape de compilation. Seul le formulaire de contact utilise PHP (`contact.php`), pour l'envoi d'e-mail sur l'hébergement mutualisé OVH.

## Structure

```
index.html              Page principale (one-page)
mentions-legales.html   Mentions légales et politique de confidentialité
merci.html              Confirmation d'envoi (sans JavaScript)
404.html                Page introuvable
contact.php             Traitement du formulaire (e-mail vers contact@secutop.fr)
.htaccess               HTTPS, redirection www, en-têtes de sécurité, cache
robots.txt, sitemap.xml Référencement
favicon.ico
assets/
  css/styles.css        Styles (charte Secutop : Rubik, #1FABE3, #00487B)
  js/main.js            Menu mobile, aperçu de marque, simulateur, formulaire
  fonts/                Rubik auto-hébergée (licence SIL OFL)
  img/                  Logos SECUSOFT et Secutop, favicons, image de partage
```

## Réglages courants

| Besoin | Où modifier |
|---|---|
| Nombre de places early bird restantes | `index.html`, attribut `data-places="20"` sur la balise `<body>`. À 0, le compteur disparaît. |
| Destinataire des demandes | `contact.php`, constante `DESTINATAIRE` |
| Adresse d'expédition des e-mails | `contact.php`, constante `EXPEDITEUR` (doit appartenir au domaine ma-prevention.fr) |
| Tarifs et textes | `index.html` (sections `#tarifs`, `#modele`, `#abonnement`, `#synthese`, `#faq`) |
| Prix du pack utilisé par le simulateur | `assets/js/main.js`, constante `PRIX_PACK` |

Après une modification de `styles.css` ou `main.js`, incrémentez le paramètre `?v=1` dans les balises `<link>` et `<script>` pour que les navigateurs rechargent les fichiers.

## Mise en ligne sur OVH

Le site est déployé par OVH directement depuis ce dépôt GitHub (déploiement Git de l'hébergement web) : ce qui est fusionné dans `main` est ce qui part en ligne.

1. Dans l'espace client OVH, vérifier que le domaine `ma-prevention.fr` pointe sur l'hébergement et que le certificat SSL est actif (Let's Encrypt, inclus).
2. Le déploiement Git doit viser la branche `main` et le dossier racine du domaine (celui qui contient `index.html` et `.htaccess`). Si le déploiement automatique n'est pas activé (webhook GitHub), relancer le déploiement depuis l'espace client après chaque fusion.
3. PHP 7.4 minimum est requis pour `contact.php` (version réglable dans l'espace client OVH, onglet *Informations générales* de l'hébergement).
4. Pour que les e-mails du formulaire ne tombent pas en spam, l'enregistrement SPF du domaine doit autoriser les serveurs OVH (c'est le cas par défaut si la zone DNS est gérée chez OVH).
5. Tester le formulaire une fois en ligne : la demande doit arriver sur `contact@secutop.fr`.

Le dépôt entier est copié sur l'hébergement. Le `.htaccess` bloque ce qui ne doit pas être public : le dossier `.git`, les fichiers commençant par un point, les fichiers `.md` et le dossier `tests/` (le dossier `.well-known` reste accessible pour les certificats).

GitHub Pages n'est pas utilisé : il n'exécute pas le PHP ni le `.htaccess`, le formulaire n'y fonctionnerait pas. Laisser GitHub Pages désactivé dans les réglages du dépôt.

Les sous-domaines des marques blanches (`votre-marque.ma-prevention.fr`) sont gérés par la plateforme SECUSOFT et ne dépendent pas de ce site.

## Avant la mise en production

- Compléter les champs marqués `[à compléter]` dans `mentions-legales.html` (raison sociale, capital, RCS, directeur de la publication).
- Vérifier les coordonnées de contact (adresse, téléphone, e-mail).

## Tester en local

```
php -S 127.0.0.1:8080
```

Puis ouvrir http://127.0.0.1:8080. L'envoi d'e-mail échoue en local sans serveur mail, c'est normal.

## Tests automatisés

Le dossier `tests/` contient une suite Playwright (Chromium, format desktop 1440 px et mobile 390 px) qui vérifie :

- chargement sans erreur, images et police, pages annexes ;
- chaque lien et bouton (ancres, menu, CTA, pied de page, mentions légales), sans élément masqué ou recouvert ;
- défilement : position des sections sous l'en-tête collant, accès direct par URL, molette, clavier, tactile, absence de défilement horizontal de 320 à 1920 px ;
- menu mobile, aperçu de marque, simulateur (souris et clavier), FAQ, compteur de places ;
- formulaire : validations, envoi réel avec contrôle de l'e-mail généré, erreurs serveur et réseau, fonctionnement sans JavaScript ;
- clavier et accessibilité (lien d'évitement, focus visible, audit axe) ;
- `contact.php` (validation, anti-spam, injection d'en-têtes) et, si un Apache est disponible, le `.htaccess`.

```
cd tests
npm install
npx playwright test
```

PHP doit être installé : le site est servi par `php -S` et les e-mails sont écrits dans `tests/.tmp/mail.log` au lieu d'être envoyés. Pour tester aussi le `.htaccess`, servir le site avec Apache et définir `BASE_URL`, `HTACCESS_URL` (et `HTACCESS_HTTP_URL` pour la redirection HTTPS sur le port 80). Le dossier `tests/` est copié chez OVH avec le reste du dépôt mais bloqué par le `.htaccess`.

## Crédits

- Police Rubik : SIL Open Font License 1.1 (`assets/fonts/OFL-Rubik.txt`)
- Icônes : [Lucide](https://lucide.dev), licence ISC
