<?php
/**
 * Formulaire de contact de ma-prevention.fr (hébergement OVH).
 *
 * Envoie la demande par e-mail à DESTINATAIRE avec la fonction mail() de PHP.
 * Répond en JSON si la requête vient du JavaScript de la page, sinon redirige
 * vers merci.html (ou affiche une page d'erreur simple).
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Paris');

const DESTINATAIRE = 'contact@secutop.fr';
// Adresse d'expédition : elle doit appartenir au domaine hébergé chez OVH.
const EXPEDITEUR = 'no-reply@ma-prevention.fr';
const SUJET = 'Offre distributeur SECUSOFT : nouvelle demande';

const STRUCTURES = ['Réseau', 'IPRP', 'Cabinet de prévention', 'Organisation à adhérents', 'Autre'];
const CLIENTS = ['', 'Moins de 50', 'De 50 à 200', 'De 200 à 1 000', 'Plus de 1 000'];

$wantsJson = strpos((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json') !== false;

function respond(bool $ok, string $message, int $code, bool $json): void
{
    if ($json) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($ok) {
        header('Location: merci.html', true, 303);
        exit;
    }
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    $safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex">'
        . '<title>Envoi impossible | SECUSOFT</title>'
        . '<link rel="stylesheet" href="assets/css/styles.css"></head>'
        . '<body><main class="page"><div class="container prose">'
        . '<h1>Envoi impossible</h1><p>' . $safe . '</p>'
        . '<p><a href="index.html#contact">Retour au formulaire</a></p>'
        . '</div></main></body></html>';
    exit;
}

/** Nettoie une valeur texte : supprime les retours à la ligne si $multiline est faux. */
function field(string $name, int $max, bool $multiline = false): string
{
    $raw = $_POST[$name] ?? '';
    $value = is_string($raw) ? trim($raw) : '';
    $value = str_replace("\0", '', $value);
    if (!$multiline) {
        $value = preg_replace('/[\r\n\t]+/', ' ', $value) ?? '';
    }
    return mb_substr($value, 0, $max, 'UTF-8');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Location: index.html#contact', true, 303);
    exit;
}

// Champ piège : rempli uniquement par les robots. On fait comme si l'envoi avait réussi.
if (field('site_web', 200) !== '') {
    respond(true, 'OK', 200, $wantsJson);
}

$nom = field('nom', 120);
$organisation = field('organisation', 150);
$email = field('email', 150);
$telephone = field('telephone', 30);
$structure = field('structure', 60);
$clients = field('clients', 60);
$message = field('message', 3000, true);
$consentement = ($_POST['consentement'] ?? '') === 'oui';

$erreurs = [];
if ($nom === '') {
    $erreurs[] = 'nom';
}
if ($organisation === '') {
    $erreurs[] = 'organisation';
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $erreurs[] = 'e-mail';
}
if (!preg_match('/^[0-9+().\s-]{6,30}$/', $telephone)) {
    $erreurs[] = 'téléphone';
}
if (!in_array($structure, STRUCTURES, true)) {
    $erreurs[] = 'type de structure';
}
if (!in_array($clients, CLIENTS, true)) {
    $erreurs[] = 'nombre de clients';
}
if (!$consentement) {
    $erreurs[] = 'consentement';
}

if ($erreurs) {
    respond(false, 'Merci de vérifier les champs suivants : ' . implode(', ', $erreurs) . '.', 422, $wantsJson);
}

$corps = implode("\n", [
    'Nouvelle demande depuis ma-prevention.fr (offre distributeur SECUSOFT)',
    '',
    'Nom : ' . $nom,
    'Organisation : ' . $organisation,
    'E-mail : ' . $email,
    'Téléphone : ' . $telephone,
    'Type de structure : ' . $structure,
    'Clients ou adhérents : ' . ($clients !== '' ? $clients : 'non précisé'),
    '',
    'Projet :',
    $message !== '' ? $message : '(non renseigné)',
    '',
    'Consentement RGPD : oui',
    'Date : ' . date('d/m/Y H:i'),
]);

$entetes = implode("\r\n", [
    'From: SECUSOFT marque blanche <' . EXPEDITEUR . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: ma-prevention.fr',
]);

$sujet = mb_encode_mimeheader(SUJET . ' (' . $organisation . ')', 'UTF-8', 'B', "\r\n");

$envoye = mail(DESTINATAIRE, $sujet, $corps, $entetes, '-f' . EXPEDITEUR);

if (!$envoye) {
    respond(false, "L'envoi n'a pas abouti. Vous pouvez nous écrire à " . DESTINATAIRE . '.', 500, $wantsJson);
}

respond(true, 'Merci, votre demande a bien été envoyée.', 200, $wantsJson);
