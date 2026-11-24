<#
  Genere une presentation PDF par cible a partir du deck distributeurs.

  Chaque PDF = le socle commun (toutes les slides avant la slide "MODULES PAR CIBLE")
             + les slides "MODULE - <CIBLE>" de la cible.
  La slide "MODULES PAR CIBLE" (sommaire interne) n'est dans aucun PDF.
  Les numeros de slide sont des champs : PowerPoint les recalcule (1 a 16).

  Necessite PowerPoint (Windows). Usage, depuis la racine du site :
    powershell -ExecutionPolicy Bypass -File outils\generer-presentations.ps1
    powershell -ExecutionPolicy Bypass -File outils\generer-presentations.ps1 -Deck "C:\chemin\deck.pptx"

  Le deck source reste hors du depot (dossier sources/, ignore par git) :
  ses notes d'orateur sont internes.
#>
param(
  [string]$Deck = (Join-Path $PSScriptRoot '..\sources\Ma-prevention_presentation_distributeurs.pptx'),
  [string]$OutDir = (Join-Path $PSScriptRoot '..\documents')
)

$ErrorActionPreference = 'Stop'

# slug du fichier => texte du titre de module (en capitales, sans accent pour rester ASCII)
$cibles = [ordered]@{
  'reseaux'            = 'SEAUX ET ORGANISATIONS'
  'assureurs'          = 'ASSUREURS'
  'experts-comptables' = 'EXPERTS-COMPTABLES'
  'prevoyance'         = 'ORGANISMES DE PR'
  'banques'            = 'BANQUES'
  'consultants'        = 'CONSULTANTS'
  'franchiseurs'       = 'FRANCHISEURS'
}

# titre du PDF (proprietes du document) ; accents en \u pour rester ASCII
$titres = @{
  'reseaux'            = "R$([char]0xE9)seaux et organisations $([char]0xE0) adh$([char]0xE9)rents"
  'assureurs'          = 'Assureurs, courtiers, agents g' + [char]0xE9 + 'n' + [char]0xE9 + 'raux'
  'experts-comptables' = 'Experts-comptables'
  'prevoyance'         = "Organismes de pr$([char]0xE9)voyance"
  'banques'            = 'Banques et r' + [char]0xE9 + 'seaux bancaires'
  'consultants'        = "Consultants QHSE, IPRP et cabinets de pr$([char]0xE9)vention"
  'franchiseurs'       = 'Franchiseurs'
}

# Garde-fous : regles de contenu du site (README), verifiees sur les slides publiees.
# Toute la presentation : pas de nombre de packs (il evolue), pas de promesse non validee par SimplX.
$interdits = @(
  @{ motif = '\b(?:[6-9]|1\d)\s+packs\b'; raison = 'nombre de packs annonce' },
  @{ motif = "centrale d"; raison = "centrale d'achat (non validee)" },
  @{ motif = 'commission jusqu'; raison = "taux de commission (non valide)" },
  @{ motif = 'Comparer au sein'; raison = 'comparaison sectorielle (non validee)' }
)
# Modules sans argument financier : les assureurs et les experts-comptables ne tirent pas de revenus de leurs clients.
$sansArgent = @('assureurs', 'experts-comptables')

$Deck = (Resolve-Path $Deck).Path
New-Item -ItemType Directory -Force $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

function Get-SlideText($slide) {
  $parts = foreach ($shape in $slide.Shapes) {
    if ($shape.HasTextFrame -and $shape.TextFrame.HasText) { $shape.TextFrame.TextRange.Text }
  }
  $parts -join "`n"
}

# Les DocumentProperties d'Office ne se lisent qu'en liaison tardive
function Set-DocProperty($pres, [string]$name, [string]$value) {
  $props = $pres.BuiltInDocumentProperties
  $prop = [System.__ComObject].InvokeMember('Item', 'GetProperty', $null, $props, @($name))
  [System.__ComObject].InvokeMember('Value', 'SetProperty', $null, $prop, @($value)) | Out-Null
}

$app = New-Object -ComObject PowerPoint.Application
try {
  # Lecture du plan du deck
  $pres = $app.Presentations.Open($Deck, -1, 0, 0)   # lecture seule, sans fenetre
  $textes = @{}
  for ($i = 1; $i -le $pres.Slides.Count; $i++) { $textes[$i] = Get-SlideText $pres.Slides.Item($i) }
  $total = $pres.Slides.Count
  $pres.Close()

  $sommaire = ($textes.Keys | Where-Object { $textes[$_].Contains('MODULES PAR CIBLE') } | Sort-Object | Select-Object -First 1)
  if (-not $sommaire) { throw 'Slide "MODULES PAR CIBLE" introuvable : impossible de separer le socle des modules.' }
  $socle = 1..($sommaire - 1)
  Write-Host "Deck : $total slides, socle commun = slides 1 a $($sommaire - 1)"

  foreach ($slug in $cibles.Keys) {
    $label = $cibles[$slug]
    $module = @($textes.Keys | Where-Object {
      $_ -gt $sommaire -and $textes[$_].Contains('MODULE ') -and $textes[$_].Contains($label)
    } | Sort-Object)
    if ($module.Count -eq 0) { throw "Aucune slide de module pour la cible $slug ($label)." }

    $garder = $socle + $module
    foreach ($i in $garder) {
      foreach ($r in $interdits) {
        if ($textes[$i] -match $r.motif) { throw "Slide ${i} ($slug) : $($r.raison) -> '$($Matches[0])'. Corriger le deck." }
      }
    }
    if ($sansArgent -contains $slug) {
      foreach ($i in $module) {
        if ($textes[$i] -match 'revenu|marge|facturation') { throw "Slide ${i} ($slug) : argument financier -> '$($Matches[0])'. Corriger le deck." }
      }
    }

    $pres = $app.Presentations.Open($Deck, -1, 0, 0)
    for ($i = $pres.Slides.Count; $i -ge 1; $i--) {
      if ($garder -notcontains $i) { $pres.Slides.Item($i).Delete() }
    }
    Set-DocProperty $pres 'Title' "Ma-prevention $([char]0x2013) Offre distributeur $([char]0x2013) $($titres[$slug])"
    Set-DocProperty $pres 'Subject' ''
    Set-DocProperty $pres 'Author' 'SimplX'

    $pdf = Join-Path $OutDir "ma-prevention-presentation-$slug.pdf"
    $pres.SaveAs($pdf, 32)   # 32 = ppSaveAsPDF
    $pres.Close()
    $ko = [math]::Round((Get-Item $pdf).Length / 1KB)
    Write-Host ("{0,-20} slides {1} -> {2} pages, {3} Ko" -f $slug, ($module -join ','), $garder.Count, $ko)
  }
}
finally {
  $app.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) | Out-Null
}
