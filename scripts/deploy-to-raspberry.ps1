# Script de déploiement automatique vers Raspberry Pi
# Usage: .\deploy-to-raspberry.ps1

param(
    [string]$RaspberryIP = "192.168.0.19",
    [string]$SSHKey = "$env:USERPROFILE\.ssh\martynx",
    [string]$User = "martynx"
)

Write-Host "🚀 Déploiement vers Raspberry Pi..." -ForegroundColor Green

# 1. Copier les fichiers modifiés
Write-Host "📁 Copie des fichiers..." -ForegroundColor Yellow
$excludeFiles = @(
    "node_modules",
    ".git",
    "logs",
    "backups",
    "*.log"
)

$excludeParams = $excludeFiles | ForEach-Object { "--exclude=$_" }
$excludeString = $excludeParams -join " "

# Utiliser rsync si disponible, sinon scp
try {
    $rsyncOutput = rsync --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "📤 Utilisation de rsync pour une copie optimisée..." -ForegroundColor Cyan
        rsync -avz --delete $excludeString -e "ssh -i $SSHKey" ./ $User@${RaspberryIP}:~/Logawa/
    } else {
        throw "rsync non disponible"
    }
} catch {
    Write-Host "📤 Utilisation de scp..." -ForegroundColor Cyan
    # Créer un tar temporaire avec les fichiers exclus
    $tempTar = "temp-deploy.tar"
    tar --exclude='node_modules' --exclude='.git' --exclude='logs' --exclude='backups' --exclude='*.log' -cf $tempTar .
    
    # Copier le tar
    scp -i $SSHKey $tempTar ${User}@${RaspberryIP}:~/
    
    # Extraire sur la Raspberry Pi
    ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~ && tar -xf $tempTar -C Logawa/ && rm $tempTar"
    
    # Nettoyer
    Remove-Item $tempTar -ErrorAction SilentlyContinue
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la copie des fichiers" -ForegroundColor Red
    exit 1
}

# 2. Reconstruire et redémarrer le conteneur
Write-Host "🔧 Reconstruction et redémarrage du conteneur..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} @"
cd ~/Logawa
docker-compose -f docker-compose.raspberry.yml down
docker-compose -f docker-compose.raspberry.yml build --no-cache
docker-compose -f docker-compose.raspberry.yml up -d
"@

if ($LASTEXIDCODE -ne 0) {
    Write-Host "❌ Erreur lors du redémarrage du conteneur" -ForegroundColor Red
    exit 1
}

# 3. Vérifier le statut
Write-Host "✅ Vérification du statut..." -ForegroundColor Yellow
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa && docker-compose -f docker-compose.raspberry.yml ps"

Write-Host "🎉 Déploiement terminé avec succès !" -ForegroundColor Green
Write-Host "📊 Logs du conteneur:" -ForegroundColor Cyan
ssh -i $SSHKey ${User}@${RaspberryIP} "cd ~/Logawa && docker-compose -f docker-compose.raspberry.yml logs --tail=10" 