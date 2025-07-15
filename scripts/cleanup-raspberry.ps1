# Script de nettoyage complet de la Raspberry Pi
# Usage: .\cleanup-raspberry.ps1

param(
    [string]$RaspberryIP = "192.168.0.19",
    [string]$SSHKey = "$env:USERPROFILE\.ssh\martynx",
    [string]$User = "martynx"
)

Write-Host "Nettoyage complet de la Raspberry Pi..." -ForegroundColor Red

# Demander confirmation
$confirmation = Read-Host "ATTENTION: Ce script va supprimer TOUS les fichiers du projet Logawa et TOUS les conteneurs Docker. Continuer ? (oui/non)"
if ($confirmation -ne "oui") {
    Write-Host "Nettoyage annule" -ForegroundColor Yellow
    exit 0
}

# 1. Arreter et supprimer les conteneurs Docker
Write-Host "Arret et suppression des conteneurs Docker..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} @"
cd ~/Logawa
docker-compose -f docker-compose.raspberry.yml down --volumes --remove-orphans
docker system prune -a -f
docker volume prune -f
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du nettoyage Docker (peut-etre que le dossier n'existe pas)" -ForegroundColor Yellow
}

# 2. Supprimer le dossier du projet
Write-Host "Suppression du dossier du projet..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "rm -rf ~/Logawa"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la suppression du dossier" -ForegroundColor Red
    exit 1
}

# 3. Nettoyage Docker supplementaire (au cas ou)
Write-Host "Nettoyage Docker supplementaire..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} @"
docker container prune -f
docker image prune -a -f
docker network prune -f
"@

# 4. Verification
Write-Host "Verification du nettoyage..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} @"
echo 'Contenu du dossier home:'
ls -la ~/ | grep -i logawa || echo 'Dossier Logawa supprime'
echo ''
echo 'Conteneurs Docker:'
docker ps -a
echo ''
echo 'Images Docker:'
docker images
"@

Write-Host "Nettoyage termine avec succes !" -ForegroundColor Green
Write-Host "Pour redeployer, utilisez: .\deploy-to-raspberry.ps1" -ForegroundColor Cyan 