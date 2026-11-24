# ma-prevention.fr

Site vitrine (one-page) de l'offre distributeur **Ma-prevention** : la plateforme de prévention des risques QHSE en marque blanche et ses packs (l'IA est intégrée à la plateforme, ce n'est pas un pack), éditée et vendue par **SimplX**, présenté comme éditeur dans le bloc `#editeur`. La page montre un exemple de marque blanche interactif (section `#exemple`), des captures d'écran de la plateforme (section `#captures`), l'hébergement et la sécurité (section `#securite`), et la frise des mises à jour de la plateforme (section `#mises-a-jour`).

Le site ne cite aucune marque blanche existante : SECUSOFT est la plateforme d'un client, elle n'y apparaît pas (test de garde). Sur les captures, le logo de la marque et celui de l'entreprise de démonstration sont masqués (« Votre logo », « MP »).

Baseline : « Votre marque. Leur sécurité. Notre plateforme. » (depuis le 27/10/2026 : « Vos revenus » ne parlait pas aux assureurs ni aux experts-comptables, qui ne peuvent pas tirer de revenus de leurs clients).

L'identité suit la charte graphique Ma-prevention (logo « l'étiquette », violet, rose, trait d'union), publiée sur claude.ai : https://claude.ai/artifact/Gv4hqXBWUKW1ox5t71obPY (privée tant qu'elle n'est pas partagée).

Site statique en HTML, CSS et JavaScript, sans framework ni étape de compilation. Les demandes de contact renvoient vers la page contact de SimplX (https://www.simplx.fr/contact/) avec l'objet « Ma-prevention – demande distributeur » et la source `utm_source=ma-prevention.fr`, pour que SimplX sache d'où vient la demande (voir « Origine des demandes de contact »).

## Structure

```
index.html              Page principale (one-page)
mentions-legales.html   Mentions légales et politique de confidentialité
cgv.html                Conditions générales de vente de l'offre distributeur
404.html                Page introuvable
.htaccess               HTTPS, redirection www, en-têtes de sécurité, cache
robots.txt, sitemap.xml Référencement
favicon.ico
assets/
  css/styles.css        Styles (charte Ma-prevention : Bricolage Grotesque, Atkinson Hyperlegible,
                        violet #6a18c2, rose #d1196c, nuit #1e1030, trait d'union #ff3d8b)
  js/main.js            Menu mobile, aperçu de marque, onglets (profils, captures), exemple de marque blanche,
                        tarif dégressif, simulateur de marge, compteur de places
  js/analytics.js       Google Analytics (G-DFL6H7MGQE), actif seulement sur ma-prevention.fr
  fonts/                Bricolage Grotesque, Atkinson Hyperlegible Next et Mono auto-hébergées (licence SIL OFL)
  img/                  Logos Ma-prevention (SVG), logo SimplX (pied de page), favicons, image de partage
  img/captures/         Captures de la plateforme, logos masqués (WebP, pleine taille et version -960 pour les petits écrans)
documents/              Présentations PDF par profil (générées, non référencées : robots.txt)
outils/                 generer-presentations.ps1 : découpe du deck distributeurs en un PDF par profil
sources/                Deck source des présentations (.pptx) : local uniquement, ignoré par git
```

## Réglages courants

| Besoin | Où modifier |
|---|---|
| Nombre de places early bird restantes | `index.html`, attribut `data-places="20"` sur la balise `<body>`. À 0, le compteur disparaît. |
| Lien du bouton « Contacter SimplX » et objet des e-mails | `index.html` : section `#contact`, pied de page et FAQ (3 liens vers simplx.fr/contact, 3 liens `mailto:`) ; `mentions-legales.html`. Garder les mêmes paramètres partout (constantes `OBJET`, `CONTACT` et `MAIL` des tests). |
| Liste et contenu des packs | `index.html`, section `#packs` (et question « Quels packs… » de la FAQ). Les noms reprennent ceux de la plateforme (écran « Mes abonnements »). Le site n'annonce volontairement aucun nombre de packs : il évolue avec les packs à venir. |
| Profils de distributeurs (« Pour qui ? ») | `index.html`, section `#pour-qui` : un bouton d'onglet et un panneau `.profile` par profil (7 profils, franchiseurs compris), chacun avec son bloc `.profile__doc` vers sa présentation PDF |
| Présentations PDF par profil | Voir « Présentations par profil » ci-dessous : deck dans `sources/`, script `outils/generer-presentations.ps1`, PDF dans `documents/`, formulaire `#demande`, constante `WEBHOOK_PRESENTATION` de `assets/js/main.js` |
| Tarif dégressif des packs (prix catalogue appliqué par SimplX) | `assets/js/main.js`, constantes `REMISES` et `SEUIL_PILOTAGE` ; textes et escalier des prix dans `index.html` (bloc `#remises`, synthèse, FAQ) et `cgv.html` (article 6) |
| Option espaces référents | `index.html`, section `#referents` (et synthèse, FAQ) et `cgv.html` (articles 10 et 11). L'espace est facturé 100 € HT par client et par an avec les intervenants du distributeur, offert avec un référent SimplX. |
| Conditions générales de vente | `cgv.html` : mettre à jour la date de version en tête de page à chaque modification, et reporter tout changement de tarif fait dans `index.html` |
| Tarifs et textes | `index.html` (sections `#tarifs`, `#modele`, `#abonnement`, `#synthese`, `#faq`) |
| Prix catalogue d'un pack (remises et simulateur) | `assets/js/main.js`, constante `PRIX_PACK` |
| Captures d'écran | `assets/img/captures/` : déposer la capture en WebP en deux tailles (`nom.webp` et `nom-960.webp`), puis ajouter un bouton d'onglet et un panneau `.shot-panel` dans la section `#captures` |
| Baseline | `index.html` : hero (`#hero-title`), pied de page (`.site-footer__baseline`), `og:title` ; image de partage `assets/img/og-image.png` |
| Exemple de marque blanche | `index.html`, section `#exemple` ; thèmes dans `assets/js/main.js` (`THEMES`) |
| Présentation de SimplX | `index.html`, bloc `#editeur` à la fin de la section `#principe` (faits repris de https://www.simplx.fr/notre-agence-simplx/, relevés le 27/10/2026), et question « Qui est SimplX » de la FAQ |
| Hébergement et sécurité | `index.html`, section `#securite` et question « Où sont hébergées les données » de la FAQ |
| Mises à jour de la plateforme | `index.html`, section `#mises-a-jour` : copier la dernière carte `<li class="maj__card">` à la fin de la liste `.maj__track` et changer version, date (`datetime` au format AAAA-MM-JJ et date affichée), titre et points. Les repères « Première version » et « Dernière version », le nombre de versions et les dates du résumé se mettent à jour seuls (`initUpdates` dans `main.js`). Aucune marque blanche ni « SECUSAM » dans les textes (dire « espace référent externalisé ») |

Après une modification de `styles.css` ou `main.js`, incrémentez le paramètre `?v=…` dans les balises `<link>` et `<script>` des trois pages pour que les navigateurs rechargent les fichiers.

L'aperçu de l'exemple applique les règles de contraste de la charte : texte blanc sur la couleur de la marque dès 4,5:1, sinon texte foncé ; liens et repères assombris jusqu'à 4,5:1 sur fond blanc. Les couleurs de cotation des risques ne changent pas d'une marque à l'autre.

## Mise en ligne

Le site est publié par **GitHub Pages** depuis la branche `main`, sur le domaine `ma-prevention.fr` (fichier `CNAME`, à conserver : le supprimer détache le domaine du site). Le nom de domaine est géré chez OVH, dont la zone DNS pointe vers GitHub Pages.

Ce qui est fusionné dans `main` est en ligne après quelques minutes.

Limites de GitHub Pages, qui ne sert que des fichiers statiques :

- Pas de PHP : aucun traitement côté serveur. Le formulaire de demande de présentation envoie ses données à un webhook Make (voir « Présentations par profil »), le bouton de contact mène à https://www.simplx.fr/contact/.
- Le `.htaccess` est ignoré (redirections, en-têtes de sécurité). GitHub gère lui-même le HTTPS (option *Enforce HTTPS* dans Settings > Pages). Le `.htaccess` reste utile si le site passe un jour sur l'hébergement web OVH.

### Origine des demandes de contact

Les liens vers https://www.simplx.fr/contact/ portent `?objet=Ma-prevention – demande distributeur` et les paramètres `utm_source=ma-prevention.fr`, `utm_medium=referral`, `utm_campaign=distributeurs`. Les liens `mailto:` portent le même objet.

- Google Analytics de simplx.fr attribue la visite à ma-prevention.fr grâce aux paramètres UTM, sans réglage.
- Pour que l'objet apparaisse dans le formulaire (Ninja Forms) et dans l'e-mail reçu, l'administrateur de simplx.fr doit, dans le formulaire « Formulaire de contact » :
  1. champ « Objet » : valeur par défaut personnalisée `{querystring:objet}` ;
  2. recommandé : ajouter un champ caché « Origine » de valeur par défaut `{querystring:utm_source}`, que le visiteur ne peut pas effacer (vide pour un contact direct sur simplx.fr) ;
  3. action « Notification e-mail » : vérifier que le message contient `{all_fields_table}` ou ces deux champs, et mettre l'objet dans le sujet de l'e-mail, par exemple `Contact simplx.fr : {field:objet_1770204953949}`.

### Présentations par profil

Chaque profil de « Pour qui ? » propose sa présentation : un PDF de 16 pages, le socle commun (offre, packs, tarifs, mise en service) suivi des 2 pages du module de la cible.

**Générer les PDF** (Windows, PowerPoint installé) : déposer le deck dans `sources/Ma-prevention_presentation_distributeurs.pptx`, puis depuis la racine du site :

```
powershell -ExecutionPolicy Bypass -File outils\generer-presentations.ps1
```

Le script prend comme socle toutes les slides placées avant la slide « MODULES PAR CIBLE » (exclue des PDF : c'est un sommaire interne), et pour chaque cible les slides titrées « MODULE – <CIBLE> ». Les numéros de slide se recalculent. Avant l'export, il refuse un deck qui enfreint les règles du site : nombre de packs annoncé, centrale d'achat, taux de commission, comparaison sectorielle (promesses non validées par SimplX), argument financier dans les modules assureurs et experts-comptables. Il écrit `documents/ma-prevention-presentation-<profil>.pdf` pour `reseaux`, `assureurs`, `experts-comptables`, `prevoyance`, `banques`, `consultants` et `franchiseurs`. Pour une nouvelle cible : ajouter une ligne dans `$cibles` et `$titres` du script, un panneau dans `#pour-qui` et une entrée dans `PRESENTATIONS` des tests.

Le deck reste hors du dépôt (`sources/` est ignoré par git) : ses notes d'orateur sont internes. Les PDF ne reprennent pas les notes.

**Collecte des coordonnées.** Le bouton « Recevoir la présentation » ouvre le formulaire `#demande` (boîte de dialogue à la fin de `#pour-qui`) : prénom, nom, organisation, e-mail, téléphone facultatif, case d'accord obligatoire et champ piège anti-robots `site`, invisible. À l'envoi :

1. les champs, avec `profil`, `profil_libelle` et `page`, partent en POST vers le webhook Make « [Ma-prevention] - Demande de présentation (site) » (constante `WEBHOOK_PRESENTATION` de `assets/js/main.js`) ;
2. le PDF du profil se télécharge (après la réponse du webhook, 4 secondes d'attente au plus : un webhook en panne ne bloque pas le visiteur) ;
3. le scénario Make « [Ma-prevention] - Demande de présentation → mail à JPB » envoie la demande par e-mail (Brevo, expéditeur « Ma-prevention (site) ») à Jean-Philippe Barret ; répondre à l'e-mail écrit au prospect. Le scénario filtre les envois sans e-mail ou sans accord, et ceux où le champ piège est rempli.

Google Analytics reçoit l'événement `generate_lead` avec le profil, sans donnée personnelle. Sans JavaScript, le bouton télécharge le PDF directement, sans collecte.

**Le scénario Make doit être actif.** Au 24/11/2026, le forfait Make limite le compte à 2 scénarios actifs, déjà occupés (publication LinkedIn et lecture des statistiques LinkedIn) : le scénario a été créé inactif. Tant qu'il l'est, les demandes attendent dans la file du webhook (50 au plus) et partent à son activation. Le formulaire est décrit dans la politique de confidentialité (`mentions-legales.html`, paragraphe `#presentation`) ; le `.htaccess` autorise `https://hook.eu2.make.com` dans la CSP (`connect-src`). Les tests interceptent le webhook : ils n'envoient jamais de vraie demande.

Les PDF restent accessibles à qui connaît leur adresse (site statique) ; `robots.txt` les tient hors des moteurs de recherche et ils ne figurent pas dans `sitemap.xml`.

**Champ « Objet » du formulaire de contact (relevé le 24/11/2026).** Ce champ est désormais une liste déroulante obligatoire : le paramètre `?objet=…` des liens de contact ne la préremplit plus, le visiteur choisit lui-même « Ma-Prévention ». Les paramètres UTM restent transmis à Google Analytics. Les étapes 1 et 3 de « Origine des demandes de contact » ci-dessus ne s'appliquent plus telles quelles.

### HTTPS

Au 21/10/2026, le site répond en HTTP mais pas en HTTPS : GitHub n'a pas émis de certificat pour `ma-prevention.fr` (le navigateur reçoit le certificat générique de GitHub, d'où l'erreur). La zone DNS est correcte (4 enregistrements A vers GitHub Pages, `www` en CNAME vers `aceosolo.github.io`, aucun enregistrement CAA bloquant). Pour déclencher l'émission, avec le compte propriétaire du dépôt :

1. Settings > Pages > Custom domain : supprimer `ma-prevention.fr`, enregistrer, puis le saisir de nouveau et enregistrer.
2. Attendre « DNS check successful », puis l'émission du certificat (de quelques minutes à 24 heures).
3. Cocher **Enforce HTTPS** : les visites en `http://` sont alors redirigées vers `https://`.

Supprimer le domaine dans les réglages réécrit le fichier `CNAME` sur `main` : vérifier qu'il contient toujours `ma-prevention.fr` après l'opération.

Les sous-domaines des marques blanches (`votre-marque.ma-prevention.fr`) sont gérés par la plateforme Ma-prevention et ne dépendent pas de ce site.

## Mentions légales et CGV

Les informations sur SimplX (forme, capital, SIREN, RCS, TVA, APE, téléphone, directeur de la publication) reprennent les mentions légales de https://www.simplx.fr/mentions-legales/ (relevées le 22/10/2026). L'hébergeur indiqué est GitHub (GitHub Pages) : si le site passe sur l'hébergement web OVH, modifier la section « Hébergement » de `mentions-legales.html`, ainsi que la phrase sur les journaux de GitHub dans la politique de confidentialité.

Les CGV (`cgv.html`) reprennent, sur les sujets communs (commande, paiement et retards, abonnements SaaS, missions de référents, données personnelles, responsabilité), les CGV d'un distributeur existant, adaptées à l'offre distributeur. Elles renvoient au contrat de distribution pour la périodicité de la refacturation et les conséquences d'une résiliation pour les clients du distributeur. À faire valider par SimplX (et idéalement un juriste) avant publication.

## Tester en local

```
php -S 127.0.0.1:8080
```

Puis ouvrir http://127.0.0.1:8080.

## Tests automatisés

Le dossier `tests/` contient une suite Playwright (Chromium, format desktop 1440 px et mobile 390 px) qui vérifie :

- chargement sans erreur, images et polices de la charte, pages annexes ;
- chaque lien et bouton (ancres, menu, CTA, pied de page, mentions légales, CGV), sans élément masqué ou recouvert ;
- défilement : position des sections sous l'en-tête collant, accès direct par URL, molette, clavier, tactile, absence de défilement horizontal de 320 à 1920 px ;
- menu mobile, aperçu de marque, simulateur (souris et clavier), FAQ, compteur de places ;
- section des packs (noms de la plateforme, pack Effectifs et compétences offert, packs à venir, IA dans le socle commun, aucun nombre de packs annoncé, grille sans case vide) ;
- tarif dégressif présenté comme le prix catalogue de SimplX (montants de 1 à 5 packs, Pilotage et plan d'actions offert dès 3), sept profils « Pour qui ? » (clic et clavier), captures d'écran, option référents (espace offert avec un référent SimplX) ;
- mentions légales conformes à simplx.fr et CGV (sommaire, tarifs identiques à ceux de la page) ;
- mentions retirées : Flex, SECUSAM, espaces « Je cherche / Je propose », « Réserver ma place » ;
- exemple de marque blanche : bascule entre le thème par défaut et une couleur libre, contrastes d'au moins 4,5:1 sur le bouton et les repères, affichage sans JavaScript ;
- bouton de contact et liens vers simplx.fr (ouverture dans un nouvel onglet vers la bonne adresse, objet et source Ma-prevention sur chaque lien de contact), aucune mention de Secutop ni de SECUSOFT ;
- retours du 27 octobre 2026 : baseline sans « Vos revenus », profils assureurs et experts-comptables sans argument financier, bloc éditeur SimplX, section hébergement et sécurité ;
- présentations par profil : un PDF de 16 pages par profil, formulaire de demande (profil repris, rien n'est envoyé sans les champs obligatoires et l'accord, envoi au webhook puis téléchargement, champ piège, audit axe), PDF hors des moteurs de recherche, deck source ignoré par git, profil franchiseurs sans centrale d'achat ni conditions négociées ;
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
