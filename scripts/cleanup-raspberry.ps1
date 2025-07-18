# Script de nettoyage pour Raspberry Pi

param(
    [string]$RaspberryIP = "192.168.0.19",
    [string]$SSHKey = "$env:USERPROFILE\.ssh\martynx",
    [string]$User = "martynx"
)

# Demander le port SSH au lancement
$SSHPort = Read-Host "Entrez le port SSH de votre Raspberry Pi (defaut: 22)"
if ($SSHPort -eq "") {
    $SSHPort = 22
} else {
    $SSHPort = [int]$SSHPort
}

Write-Host "=== NETTOYAGE RASPBERRY PI ===" -ForegroundColor Red
Write-Host "Utilisation du port SSH: $SSHPort" -ForegroundColor Yellow
Write-Host ""

# Demander confirmation
$confirmation = Read-Host "Ce script va nettoyer Docker et redemarrer le conteneur Logawa. Continuer ? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "Operation annulee." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n1. Arret du conteneur Logawa..." -ForegroundColor Yellow
ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml down"

Write-Host "`n2. Suppression du conteneur Logawa..." -ForegroundColor Yellow
ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "docker rm -f liko-discord-bot 2>/dev/null || echo 'Conteneur deja supprime'"

Write-Host "`n3. Suppression des images Docker non utilisees..." -ForegroundColor Yellow
ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "docker image prune -f"

Write-Host "`n4. Nettoyage complet du systeme Docker..." -ForegroundColor Yellow
ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "docker system prune -f"

Write-Host "`n5. Nettoyage des volumes non utilisees..." -ForegroundColor Yellow
ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "docker volume prune -f"

Write-Host "`n6. Nettoyage des reseaux non utilisees..." -ForegroundColor Yellow
ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "docker network prune -f"

Write-Host "`n7. Verification de l'espace libere..." -ForegroundColor Yellow
$diskBefore = ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "df -h /"
Write-Host "Espace disque apres nettoyage:" -ForegroundColor Cyan
Write-Host $diskBefore -ForegroundColor Cyan

Write-Host "`n8. Redemarrage du conteneur..." -ForegroundColor Yellow
ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml up -d"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Conteneur redemarre avec succes!" -ForegroundColor Green
    
    Write-Host "`n9. Verification du statut..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml ps"
    
    Write-Host "`n10. Logs du conteneur..." -ForegroundColor Yellow
    ssh -i $SSHKey -p $SSHPort ${User}@${RaspberryIP} "cd ~/Logawa; docker compose -f docker-compose.raspberry.yml logs --tail=10"
} else {
    Write-Host "`n✗ Erreur lors du redemarrage du conteneur" -ForegroundColor Red
}

Write-Host "`n=== NETTOYAGE TERMINE ===" -ForegroundColor Green 