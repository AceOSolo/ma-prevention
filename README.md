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

1. Dans l'espace client OVH, vérifier que le domaine `ma-prevention.fr` pointe sur l'hébergement et activer le certificat SSL (Let's Encrypt, inclus).
2. Envoyer tout le contenu du dépôt (sauf `README.md` et `.git`) dans le dossier `www/` de l'hébergement, par FTP (FileZilla) ou SFTP.
3. PHP 7.4 minimum est requis pour `contact.php` (version réglable dans l'espace client OVH, onglet *Informations générales* de l'hébergement).
4. Pour que les e-mails du formulaire ne tombent pas en spam, l'enregistrement SPF du domaine doit autoriser les serveurs OVH (c'est le cas par défaut si la zone DNS est gérée chez OVH).
5. Tester le formulaire une fois en ligne : la demande doit arriver sur `contact@secutop.fr`.

Les sous-domaines des marques blanches (`votre-marque.ma-prevention.fr`) sont gérés par la plateforme SECUSOFT et ne dépendent pas de ce site.

## Avant la mise en production

- Compléter les champs marqués `[à compléter]` dans `mentions-legales.html` (raison sociale, capital, RCS, directeur de la publication).
- Vérifier les coordonnées de contact (adresse, téléphone, e-mail).

## Tester en local

```
php -S 127.0.0.1:8080
```

Puis ouvrir http://127.0.0.1:8080. L'envoi d'e-mail échoue en local sans serveur mail, c'est normal.

## Crédits

- Police Rubik : SIL Open Font License 1.1 (`assets/fonts/OFL-Rubik.txt`)
- Icônes : [Lucide](https://lucide.dev), licence ISC
