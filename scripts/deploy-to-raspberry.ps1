# Script de deploiement automatique vers Raspberry Pi

param(
    [string]$RaspberryIP = "192.168.0.19",
    [string]$SSHKey = "$env:USERPROFILE\.ssh\martynx",
    [string]$User = "martynx"
)

Write-Host "Deploiement vers Raspberry Pi..." -ForegroundColor Green

# Verifier si le depot existe
Write-Host "Verification du depot Git..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "test -d ~/Logawa/.git"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Le depot Git n'existe pas sur la Raspberry Pi." -ForegroundColor Red
    Write-Host "Veuillez d'abord executer: .\setup-raspberry.ps1" -ForegroundColor Yellow
    exit 1
}

# Verifier Docker et Docker Compose
Write-Host "Verification de Docker..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "docker --version; docker compose version"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker ou Docker Compose n'est pas installe." -ForegroundColor Red
    Write-Host "Veuillez d'abord executer: .\setup-raspberry.ps1" -ForegroundColor Yellow
    exit 1
}

# 1. Mettre a jour le code avec git pull
Write-Host "Mise a jour du code avec git pull..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; git stash; git pull origin main; git stash pop 2>/dev/null || true"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la mise a jour du code" -ForegroundColor Red
    exit 1
}

# 2. Verifier et creer le fichier .env si necessaire
Write-Host "Verification du fichier .env..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; if [ ! -f .env ]; then cp env.example .env; echo 'Fichier .env cree a partir de env.example. Veuillez le configurer.'; fi"

# 3. Creer les repertoires de logs et backups si necessaire
Write-Host "Creation des repertoires de stockage..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "mkdir -p ~/logawa-logs ~/logawa-backups"

# 4. Arreter le conteneur existant
Write-Host "Arret du conteneur existant..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml down"

# 5. Nettoyer les images Docker anciennes
Write-Host "Nettoyage des images Docker..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "docker system prune -f"

# 6. Reconstruire l'image sans cache
Write-Host "Reconstruction de l'image Docker..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml build --no-cache"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la reconstruction de l'image" -ForegroundColor Red
    exit 1
}

# 7. Demarrer le conteneur
Write-Host "Demarrage du conteneur..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml up -d"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du demarrage du conteneur" -ForegroundColor Red
    exit 1
}

# 8. Attendre que le conteneur soit pret
Write-Host "Attente du demarrage du conteneur..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 9. Verifier le statut du conteneur
Write-Host "Verification du statut du conteneur..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml ps"

# 10. Verifier les logs pour detecter les erreurs
Write-Host "Verification des logs..." -ForegroundColor Yellow
$logs = ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml logs --tail=20"
Write-Host $logs -ForegroundColor Cyan

# 11. Verifier que le conteneur est en cours d'execution
Write-Host "Verification de l'etat du conteneur..." -ForegroundColor Yellow
$containerStatus = ssh -i $SSHKey ${User}@${RaspberryIP} "docker ps --filter name=liko-discord-bot --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
Write-Host $containerStatus -ForegroundColor Green

# 12. Verifier l'espace disque
Write-Host "Verification de l'espace disque..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "df -h"

Write-Host "Deploiement termine !" -ForegroundColor Green
Write-Host "Pour voir les logs en temps reel: ssh -i $SSHKey ${User}@${RaspberryIP} 'cd ~/Logawa; docker compose -f docker-compose.raspberry.yml logs -f'" -ForegroundColor Cyan 