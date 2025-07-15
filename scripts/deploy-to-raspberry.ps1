# Script de deploiement automatique vers Raspberry Pi
# Usage: .\deploy-to-raspberry.ps1

param(
    [string]$RaspberryIP = "192.168.0.19",
    [string]$SSHKey = "$env:USERPROFILE\.ssh\martynx",
    [string]$User = "martynx"
)

Write-Host "Deploiement vers Raspberry Pi..." -ForegroundColor Green

# 1. Mettre a jour le code avec git pull
Write-Host "Mise a jour du code avec git pull..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} @"
cd ~/Logawa
git stash
git pull origin main
git stash pop
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la mise a jour du code" -ForegroundColor Red
    exit 1
}

# 2. Reconstruire et redemarrer le conteneur
Write-Host "Reconstruction et redemarrage du conteneur..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} @"
cd ~/Logawa
docker-compose -f docker-compose.raspberry.yml down
docker-compose -f docker-compose.raspberry.yml build --no-cache
docker-compose -f docker-compose.raspberry.yml up -d
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du redemarrage du conteneur" -ForegroundColor Red
    exit 1
}

# 3. Verifier le statut
Write-Host "Verification du statut..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; docker-compose -f docker-compose.raspberry.yml ps"

Write-Host "Deploiement termine avec succes !" -ForegroundColor Green
Write-Host "Logs du conteneur:" -ForegroundColor Cyan
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; docker-compose -f docker-compose.raspberry.yml logs --tail=10" 