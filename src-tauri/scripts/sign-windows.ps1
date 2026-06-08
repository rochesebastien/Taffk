<#
.SYNOPSIS
  Signe l'app Taffk avec un certificat auto-signé, et installe ce certificat
  comme "éditeur de confiance" pour faire taire l'avertissement Windows
  Defender / SmartScreen ("éditeur inconnu") sur CETTE machine.

.DESCRIPTION
  L'avertissement Windows vient du fait que l'exécutable n'est pas signé : pour
  Windows, l'éditeur est "inconnu". Ce script :

    1. crée (ou réutilise) un certificat de signature de code auto-signé,
    2. l'installe dans le magasin "Racines de confiance" + "Éditeurs approuvés"
       de l'utilisateur courant, pour que Windows fasse confiance à sa signature,
    3. signe l'exécutable (et l'installateur) Taffk avec ce certificat,
       horodatage RFC-3161 inclus.

  Après ça, lancer l'app ne déclenche plus l'alerte "éditeur inconnu" SUR CETTE
  MACHINE. C'est la solution gratuite et immédiate pour un usage personnel.

  /!\ Un certificat auto-signé n'est PAS reconnu sur les autres ordinateurs :
  pour une vraie distribution (release GitHub), il faut une signature de
  confiance (Azure Trusted Signing ou certificat OV/EV). Voir DEPLOYMENT.md.

.PARAMETER Path
  Fichier(s) .exe à signer. Par défaut, signe l'exécutable de release et, s'il
  existe, l'installateur NSIS produits par `npm run tauri build`.

.PARAMETER Subject
  Sujet (CN) du certificat. Défaut : "CN=Taffk".

.EXAMPLE
  # Depuis la racine du repo, après `npm run tauri build` :
  pwsh -File src-tauri/scripts/sign-windows.ps1

.EXAMPLE
  pwsh -File src-tauri/scripts/sign-windows.ps1 -Path "C:\chemin\vers\taffk.exe"
#>
[CmdletBinding()]
param(
  [string[]]$Path,
  [string]$Subject = "CN=Taffk"
)

$ErrorActionPreference = "Stop"

# $IsWindows n'existe que sous PowerShell 7+ ; sous Windows PowerShell 5.1 il
# est indéfini (et l'OS est forcément Windows). On ne bloque donc que s'il est
# explicitement défini à $false (pwsh sous Linux/macOS).
if ($null -ne $IsWindows -and -not $IsWindows) {
  throw "Ce script ne fonctionne que sous Windows (signature Authenticode)."
}

# --- 1. Certificat : réutiliser celui qui existe, sinon le créer -------------
$cert = Get-ChildItem Cert:\CurrentUser\My |
  Where-Object { $_.Subject -eq $Subject -and $_.HasPrivateKey } |
  Sort-Object NotAfter -Descending |
  Select-Object -First 1

if (-not $cert) {
  Write-Host "Création d'un certificat de signature de code auto-signé ($Subject)…"
  $cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $Subject `
    -CertStoreLocation Cert:\CurrentUser\My `
    -KeyUsage DigitalSignature `
    -KeyExportPolicy Exportable `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(3)
} else {
  Write-Host "Réutilisation du certificat existant ($Subject), empreinte $($cert.Thumbprint)."
}

Write-Host "Empreinte (thumbprint) : $($cert.Thumbprint)" -ForegroundColor Cyan

# --- 2. Faire confiance au certificat sur cette machine ----------------------
# Un certificat auto-signé est sa propre racine : on l'ajoute aux racines de
# confiance ET aux éditeurs approuvés de l'utilisateur courant. La première
# fois, Windows peut afficher une confirmation de sécurité : accepter.
foreach ($storeName in @("Root", "TrustedPublisher")) {
  $storePath = "Cert:\CurrentUser\$storeName"
  $already = Get-ChildItem $storePath | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
  if (-not $already) {
    Write-Host "Installation du certificat dans $storePath…"
    $x509Store = New-Object System.Security.Cryptography.X509Certificates.X509Store($storeName, "CurrentUser")
    $x509Store.Open("ReadWrite")
    $x509Store.Add($cert)
    $x509Store.Close()
  }
}

# --- 3. Cibles à signer ------------------------------------------------------
if (-not $Path -or $Path.Count -eq 0) {
  $repoRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)  # …/src-tauri/scripts -> repo
  $releaseDir = Join-Path $repoRoot "src-tauri/target/release"
  $candidates = @(Join-Path $releaseDir "taffk.exe")
  $bundleDir  = Join-Path $releaseDir "bundle/nsis"
  if (Test-Path $bundleDir) {
    $candidates += (Get-ChildItem $bundleDir -Filter "*-setup.exe" | Select-Object -ExpandProperty FullName)
  }
  $Path = $candidates | Where-Object { Test-Path $_ }
}

if (-not $Path -or $Path.Count -eq 0) {
  throw "Aucun exécutable à signer. Lancez d'abord `npm run tauri build`, ou passez -Path."
}

# --- 4. Signer + horodater ---------------------------------------------------
$timestamp = "http://timestamp.digicert.com"
foreach ($file in $Path) {
  Write-Host "Signature de $file…"
  $result = Set-AuthenticodeSignature `
    -FilePath $file `
    -Certificate $cert `
    -HashAlgorithm SHA256 `
    -TimestampServer $timestamp
  if ($result.Status -ne "Valid") {
    throw "Échec de la signature de $file : $($result.Status) - $($result.StatusMessage)"
  }
  Write-Host "  → signé ($($result.Status))." -ForegroundColor Green
}

Write-Host ""
Write-Host "Terminé. L'app signée ne devrait plus déclencher l'alerte" -ForegroundColor Green
Write-Host "'éditeur inconnu' de Windows Defender / SmartScreen sur cette machine." -ForegroundColor Green
